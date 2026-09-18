import { NextResponse } from "next/server";
import { StoreUnavailableError, explainStoreError, isStoreConfigured, sanitizeStoreError, storeConfigIssue } from "./store";

// Lit le corps JSON sans jamais lever : un body vide ou malformé produisait
// une 500 HTML, que le client tentait ensuite de parser en JSON (d'où des
// "Unexpected token '<'" au lieu d'un message lisible).
export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

// Les codes de partie sont stockés en majuscules. Les normaliser ici évite
// qu'une URL saisie en minuscules trouve la partie au GET mais échoue au
// POST /join et /action.
export function normalizeCode(code: unknown): string | null {
  if (typeof code !== "string") return null;
  const trimmed = code.trim().toUpperCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function storeNotConfigured() {
  const issue = storeConfigIssue();
  return NextResponse.json(
    {
      error:
        "Serveur mal configuré : stockage des parties indisponible. Relie une base KV/Upstash au projet (KV_REST_API_URL + KV_REST_API_TOKEN, ou UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN) puis redéploie. Diagnostic : /api/health. Le mode simulation reste utilisable.",
      hint: issue,
    },
    { status: 503 },
  );
}

// Exécute un handler en garantissant une réponse JSON, quoi qu'il arrive.
export async function withApiErrors(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  if (!isStoreConfigured()) return storeNotConfigured();
  try {
    return await handler();
  } catch (e) {
    if (e instanceof StoreUnavailableError) {
      console.error("[api] stockage indisponible", e.cause);
      // La cause assainie voyage avec la réponse : les logs Vercel ne sont pas
      // consultables depuis l'appareil où la panne se produit.
      const cause = sanitizeStoreError(e.cause);
      return NextResponse.json(
        {
          error: "Stockage des parties momentanément indisponible. Réessaie.",
          cause,
          hint: storeConfigIssue() ?? explainStoreError(cause),
        },
        { status: 503 },
      );
    }
    console.error("[api] erreur inattendue", e);
    return NextResponse.json({ error: "Erreur serveur inattendue" }, { status: 500 });
  }
}
