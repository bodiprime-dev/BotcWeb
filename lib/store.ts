import { createClient, type VercelKV } from "@vercel/kv";
import type { GameState } from "./types";

const TTL_SECONDS = 60 * 60 * 24; // une partie expire après 24h

const key = (code: string) => `game:${code}`;

// Levée quand Vercel KV n'est pas joignable (variables d'environnement
// absentes, service indisponible). Les routes la traduisent en réponse JSON
// explicite plutôt qu'en 500 HTML, qui cassait le `res.json()` côté client.
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
const CREDENTIAL_PAIRS = [
  { url: "KV_REST_API_URL", token: "KV_REST_API_TOKEN" },
  { url: "UPSTASH_REDIS_REST_URL", token: "UPSTASH_REDIS_REST_TOKEN" },
  { url: "REDIS_REST_API_URL", token: "REDIS_REST_API_TOKEN" },
] as const;

function readCredentials(): { url: string; token: string } | null {
  for (const pair of CREDENTIAL_PAIRS) {
    const url = process.env[pair.url];
    const token = process.env[pair.token];
    if (url && token) return { url, token };
  }
  return null;
}

// Noms des variables réellement présentes — utile au diagnostic (`/api/health`)
// sans jamais exposer la moindre valeur secrète.
export function configuredCredentialNames(): string[] {
  for (const pair of CREDENTIAL_PAIRS) {
    if (process.env[pair.url] && process.env[pair.token]) return [pair.url, pair.token];
  }
  return [];
}

// Noms des variables liées au stockage présentes dans l'environnement, sans
// leur valeur. Quand aucune paire REST n'est complète, c'est ce qui permet de
// voir *ce qui manque* : Upstash injecte aussi REDIS_URL / KV_URL, qui sont des
// URLs TCP inutilisables par le client REST de @vercel/kv.
export function relatedEnvNames(): string[] {
  return Object.keys(process.env)
    .filter((name) => /^(KV_|UPSTASH_|REDIS_)/.test(name))
    .sort();
}

export function isStoreConfigured(): boolean {
  return readCredentials() !== null;
}

let cached: VercelKV | null = null;

function client(): VercelKV {
  if (cached) return cached;
  const credentials = readCredentials();
  if (!credentials) {
    throw new StoreUnavailableError(new Error("Identifiants REST du stockage absents de l'environnement"));
  }
  cached = createClient(credentials);
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

// Aller-retour réel avec le stockage : `isStoreConfigured()` ne dit que si les
// variables existent, pas si elles sont valides (token révoqué, base supprimée).
export async function pingStore(): Promise<{ ok: boolean; error?: string }> {
  try {
    await client().set("health:ping", Date.now(), { ex: 60 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
