import { kv } from "@vercel/kv";
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

export function isStoreConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getGame(code: string): Promise<GameState | null> {
  try {
    const game = await kv.get<GameState>(key(code));
    return game ?? null;
  } catch (e) {
    throw new StoreUnavailableError(e);
  }
}

export async function saveGame(game: GameState): Promise<void> {
  try {
    await kv.set(key(game.code), game, { ex: TTL_SECONDS });
  } catch (e) {
    throw new StoreUnavailableError(e);
  }
}

export async function deleteGame(code: string): Promise<void> {
  try {
    await kv.del(key(code));
  } catch (e) {
    throw new StoreUnavailableError(e);
  }
}
