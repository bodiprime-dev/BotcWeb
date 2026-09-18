import { createClient, type VercelKV } from "@vercel/kv";
import { lookup } from "node:dns/promises";
import type { GameState } from "./types";

const TTL_SECONDS = 60 * 60 * 24; // une partie expire après 24h

const key = (code: string) => `game:${code}`;

// Levée quand le stockage n'est pas joignable (variables d'environnement
// absentes ou invalides, service indisponible). Les routes la traduisent en
// réponse JSON explicite plutôt qu'en 500 HTML, qui cassait le `res.json()`
// côté client.
export class StoreUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Stockage de partie indisponible");
    this.name = "StoreUnavailableError";
    this.cause = cause;
  }
}

// Vercel KV est désormais servi par l'intégration Upstash du Marketplace.
// Selon la manière dont la base a été créée puis reliée au projet, Vercel
// injecte KV_REST_API_URL/KV_REST_API_TOKEN *ou* UPSTASH_REDIS_REST_URL/
// UPSTASH_REDIS_REST_TOKEN. Le singleton `kv` exporté par @vercel/kv ne lit
// que la première paire : avec une base Upstash correctement reliée, toutes
// les routes répondaient malgré tout « stockage indisponible ».
//
// L'ordre compte : la première paire complète gagne. BOTC_* est en tête parce
// qu'elle sert d'échappatoire — les variables posées par une intégration
// Marketplace peuvent être verrouillées (ni modifiables ni supprimables depuis
// l'interface) alors même qu'elles pointent vers une base détruite. Dans ce
// cas, aucune manipulation Vercel ne débloque la situation ; ajouter
// BOTC_KV_REST_API_URL + BOTC_KV_REST_API_TOKEN, si.
const CREDENTIAL_PAIRS = [
  { url: "BOTC_KV_REST_API_URL", token: "BOTC_KV_REST_API_TOKEN" },
  { url: "KV_REST_API_URL", token: "KV_REST_API_TOKEN" },
  { url: "UPSTASH_REDIS_REST_URL", token: "UPSTASH_REDIS_REST_TOKEN" },
  { url: "REDIS_REST_API_URL", token: "REDIS_REST_API_TOKEN" },
] as const;

type Credentials = { url: string; token: string; source: string };

// `.trim()` sur les deux valeurs : une variable collée dans l'interface Vercel
// embarque très souvent une espace ou un retour à la ligne. `fetch()` reçoit
// alors une URL invalide et lève avant même d'atteindre le réseau — un échec
// qui ressemble en tout point à une base injoignable.
function candidate(pair: (typeof CREDENTIAL_PAIRS)[number]) {
  return {
    urlName: pair.url,
    tokenName: pair.token,
    url: process.env[pair.url]?.trim() ?? "",
    token: process.env[pair.token]?.trim() ?? "",
  };
}

// Le client Upstash parle HTTP. Une URL `redis://` ou `rediss://` (celle de
// REDIS_URL / KV_URL, destinée à un client TCP) recopiée dans la variable REST
// produit un échec au premier appel, sans jamais dire pourquoi.
function isRestUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function readCredentials(): Credentials | null {
  for (const pair of CREDENTIAL_PAIRS) {
    const c = candidate(pair);
    if (c.url && c.token && isRestUrl(c.url)) {
      return { url: c.url, token: c.token, source: c.urlName };
    }
  }
  return null;
}

// Décrit, sans jamais exposer de valeur, ce qui empêche le stockage de
// fonctionner. `null` quand la configuration est exploitable.
export function storeConfigIssue(): string | null {
  if (readCredentials()) return null;

  for (const pair of CREDENTIAL_PAIRS) {
    const c = candidate(pair);
    if (c.url && !isRestUrl(c.url)) {
      const protocol = c.url.split("://")[0];
      return `${c.urlName} contient une URL « ${protocol}:// » : c'est l'URL TCP de la base. Le client attend l'URL REST (https://…), celle qu'Upstash affiche sous « REST API ».`;
    }
    if (c.url && !c.token) return `${c.urlName} est défini mais ${c.tokenName} manque.`;
    if (!c.url && c.token) return `${c.tokenName} est défini mais ${c.urlName} manque.`;
  }
  return "Aucune paire URL + token REST n'est définie dans l'environnement.";
}

// Noms des variables réellement utilisées — diagnostic sans aucune valeur.
export function configuredCredentialNames(): string[] {
  const found = readCredentials();
  if (!found) return [];
  const pair = CREDENTIAL_PAIRS.find((p) => p.url === found.source);
  return pair ? [pair.url, pair.token] : [];
}

// Noms des variables liées au stockage présentes dans l'environnement, sans
// leur valeur. Quand aucune paire REST n'est complète, c'est ce qui permet de
// voir *ce qui manque* : Upstash injecte aussi REDIS_URL / KV_URL, qui sont des
// URLs TCP inutilisables par le client REST.
export function relatedEnvNames(): string[] {
  return Object.keys(process.env)
    .filter((name) => /^(BOTC_KV_|KV_|UPSTASH_|REDIS_)/.test(name))
    .sort();
}

// Cible du stockage, masquée : on garde le domaine (upstash.io, vercel-storage
// .com…) qui suffit à vérifier qu'on parle bien au bon service, et on cache le
// sous-domaine, qui identifie la base.
export function storeTargetLabel(): string | null {
  const found = readCredentials();
  if (!found) return null;
  try {
    const host = new URL(found.url).hostname;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host; // adresse IP : rien à masquer
    const parts = host.split(".");
    return parts.length > 2 ? `***.${parts.slice(-2).join(".")}` : host;
  } catch {
    return "URL illisible";
  }
}

// Anomalies détectables dans les *valeurs* sans jamais les divulguer. Un
// caractère invisible (espace insécable, U+200B) survit au copier-coller et à
// `trim()` : il rend l'URL invalide sans rien changer à son apparence.
export function inspectCredentials(): string[] {
  const found = readCredentials();
  if (!found) return [];
  const anomalies: string[] = [];

  if (/[^\x20-\x7E]/.test(found.url)) anomalies.push("l'URL contient un caractère non-ASCII (invisible ?)");
  if (/[^\x20-\x7E]/.test(found.token)) anomalies.push("le token contient un caractère non-ASCII (invisible ?)");
  if (/["'`]/.test(found.url)) anomalies.push("l'URL contient un guillemet — la valeur a été collée avec ses délimiteurs");
  if (/["'`]/.test(found.token)) anomalies.push("le token contient un guillemet");

  try {
    const parsed = new URL(found.url);
    if (parsed.pathname !== "/" && parsed.pathname !== "") anomalies.push(`l'URL comporte un chemin (« ${parsed.pathname} ») — l'URL REST s'arrête au nom d'hôte`);
    if (parsed.search) anomalies.push("l'URL comporte une chaîne de requête");
    if (parsed.username || parsed.password) anomalies.push("l'URL embarque des identifiants — c'est la forme TCP, pas la forme REST");
  } catch {
    anomalies.push("l'URL n'est pas analysable");
  }
  return anomalies;
}

export function isStoreConfigured(): boolean {
  return readCredentials() !== null;
}

let cached: VercelKV | null = null;

function client(): VercelKV {
  if (cached) return cached;
  const credentials = readCredentials();
  if (!credentials) {
    throw new StoreUnavailableError(new Error(storeConfigIssue() ?? "Configuration du stockage invalide"));
  }
  cached = createClient({ url: credentials.url, token: credentials.token });
  return cached;
}

export async function getGame(code: string): Promise<GameState | null> {
  try {
    const game = await client().get<GameState>(key(code));
    return game ?? null;
  } catch (e) {
    throw e instanceof StoreUnavailableError ? e : new StoreUnavailableError(e);
  }
}

export async function saveGame(game: GameState): Promise<void> {
  try {
    await client().set(key(game.code), game, { ex: TTL_SECONDS });
  } catch (e) {
    throw e instanceof StoreUnavailableError ? e : new StoreUnavailableError(e);
  }
}

export async function deleteGame(code: string): Promise<void> {
  try {
    await client().del(key(code));
  } catch (e) {
    throw e instanceof StoreUnavailableError ? e : new StoreUnavailableError(e);
  }
}

// Le message d'erreur brut peut contenir l'URL de la base, voire le token en
// cas de `fetch` trop bavard. On ne renvoie donc jamais la chaîne telle quelle.
function redact(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "<url>")
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, "<secret>");
}

// `fetch` d'undici lève invariablement « TypeError: fetch failed » et range le
// motif réel dans `cause` : getaddrinfo ENOTFOUND, ECONNREFUSED, un code TLS…
// Ne lire que `message` revenait à jeter la seule information utile. On
// parcourt donc la chaîne des causes en collectant `code` et `message`.
export function sanitizeStoreError(e: unknown): string {
  const parts: string[] = [];
  let current: unknown = e;
  for (let depth = 0; current instanceof Error && depth < 4; depth++) {
    const code = (current as NodeJS.ErrnoException).code;
    parts.push(code ? `${current.message} (${code})` : current.message);
    current = (current as { cause?: unknown }).cause;
  }
  if (!parts.length) parts.push(String(e));
  return redact(parts.join(" ← ")).slice(0, 300);
}

// Traduit l'échec en cause probable. Les messages viennent d'@upstash/redis
// (réponse HTTP) ou de `fetch` (réseau, URL invalide).
export function explainStoreError(message: string): string {
  if (/401|unauthorized|wrongpass|noperm/i.test(message)) {
    return "Le token REST est refusé par la base : il a été régénéré, ou il appartient à une autre base que l'URL. Recopie la paire URL + token depuis la même base, puis redéploie.";
  }
  if (/404|not found/i.test(message)) {
    return "La base répond « introuvable » : elle a probablement été supprimée ou renommée. Recrée-la et relie-la au projet.";
  }
  if (/enotfound|eai_again|getaddrinfo/i.test(message)) {
    return "Le nom d'hôte de la base n'existe plus dans le DNS : la base a été supprimée, ou l'URL contient une faute de frappe. Les bases Vercel KV héritées ont été retirées lors du passage à l'intégration Upstash du Marketplace — dans ce cas il faut en créer une nouvelle, la relier au projet, puis redéployer.";
  }
  if (/econnrefused|econnreset|ehostunreach|enetunreach/i.test(message)) {
    return "L'hôte répond mais refuse la connexion : la base est suspendue (quota dépassé, paiement en attente) ou le port de l'URL a été modifié.";
  }
  if (/etimedout|timeout|und_err_connect_timeout|abort/i.test(message)) {
    return "Délai dépassé en joignant la base : incident côté Upstash, ou base hébergée dans une région très éloignée de la fonction Vercel.";
  }
  if (/cert|tls|ssl|self.signed|unable to verify/i.test(message)) {
    return "Échec de la négociation TLS avec la base : certificat expiré côté fournisseur, ou URL pointant vers un hôte qui n'est pas celui attendu.";
  }
  if (/fetch failed|network|invalid url|failed to parse/i.test(message)) {
    return "L'URL REST est injoignable : vérifie qu'elle est complète, en https://, sans espace ni retour à la ligne parasite (un copier-coller en ajoute souvent un).";
  }
  if (/429|quota|limit|exceeded/i.test(message)) {
    return "Quota de la base atteint (plan gratuit Upstash) : attends la fenêtre suivante ou passe au plan supérieur.";
  }
  return "Cause non reconnue — le détail brut est dans les logs Vercel de la fonction concernée.";
}

// Aller-retour réel avec le stockage : `isStoreConfigured()` ne dit que si les
// variables existent, pas si elles sont valides (token révoqué, base supprimée).
export async function resolveStoreHost(): Promise<{ resolved: boolean; detail: string }> {
  const found = readCredentials();
  if (!found) return { resolved: false, detail: "aucune URL" };
  try {
    const { hostname } = new URL(found.url);
    await lookup(hostname);
    return { resolved: true, detail: "le nom d'hôte est résolu" };
  } catch (e) {
    return { resolved: false, detail: sanitizeStoreError(e) };
  }
}

export async function pingStore(): Promise<{ ok: boolean; error?: string; hint?: string }> {
  try {
    await client().set("health:ping", Date.now(), { ex: 60 });
    return { ok: true };
  } catch (e) {
    const error = sanitizeStoreError(e);
    return { ok: false, error, hint: explainStoreError(error) };
  }
}
