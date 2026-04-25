import { kv } from "@vercel/kv";
import type { GameState } from "./types";

const TTL_SECONDS = 60 * 60 * 24; // une partie expire après 24h

const key = (code: string) => `game:${code}`;

export async function getGame(code: string): Promise<GameState | null> {
  const game = await kv.get<GameState>(key(code));
  return game ?? null;
}

export async function saveGame(game: GameState): Promise<void> {
  await kv.set(key(game.code), game, { ex: TTL_SECONDS });
}

export async function deleteGame(code: string): Promise<void> {
  await kv.del(key(code));
}
