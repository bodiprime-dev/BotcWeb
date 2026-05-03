import Redis, { type RedisOptions } from "ioredis";
import type { GameState } from "./types";

const TTL_SECONDS = 60 * 60 * 24; // une partie expire après 24h
const key = (code: string) => `game:${code}`;

export interface GameStore {
  getGame(code: string): Promise<GameState | null>;
  saveGame(game: GameState): Promise<void>;
  deleteGame(code: string): Promise<void>;
}

class RedisGameStore implements GameStore {
  constructor(private readonly client: Redis) {}

  async getGame(code: string): Promise<GameState | null> {
    const raw = await this.client.get(key(code));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  }

  async saveGame(game: GameState): Promise<void> {
    await this.client.set(key(game.code), JSON.stringify(game), "EX", TTL_SECONDS);
  }

  async deleteGame(code: string): Promise<void> {
    await this.client.del(key(code));
  }
}

// Singleton — partagé en dev (HMR) et en prod (process long-lived sur PaaS).
const globalForStore = globalThis as unknown as {
  __botcRedis?: Redis;
  __botcGameStore?: GameStore;
};

function buildRedisClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL n'est pas défini. Configure une instance Redis (locale via docker, ou managée sur Railway/Render/Upstash)."
    );
  }
  const options: RedisOptions = { maxRetriesPerRequest: 3 };
  return new Redis(url, options);
}

function getStore(): GameStore {
  if (!globalForStore.__botcGameStore) {
    if (!globalForStore.__botcRedis) {
      globalForStore.__botcRedis = buildRedisClient();
    }
    globalForStore.__botcGameStore = new RedisGameStore(globalForStore.__botcRedis);
  }
  return globalForStore.__botcGameStore;
}

// API publique — signatures inchangées pour les appelants existants.
export const getGame = (code: string) => getStore().getGame(code);
export const saveGame = (game: GameState) => getStore().saveGame(game);
export const deleteGame = (code: string) => getStore().deleteGame(code);
