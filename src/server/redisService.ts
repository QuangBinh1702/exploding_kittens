import { Redis } from "@upstash/redis";
import type { ServerGameState } from "@/game-engine";
import type { PublicRoomSummary, RoomSettings } from "./roomTypes";

const memoryStore = new Map<string, string>();
const memoryLocks = new Map<string, number>();

function redisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return undefined;
  return new Redis({ url, token });
}

export class RedisService {
  private redis = redisClient();

  async getGame(gameId: string): Promise<ServerGameState | undefined> {
    const key = `game:${gameId}`;
    if (!this.redis) {
      const raw = memoryStore.get(key);
      return raw ? (JSON.parse(raw) as ServerGameState) : undefined;
    }
    return (await this.redis.get<ServerGameState>(key)) ?? undefined;
  }

  async setGame(state: ServerGameState) {
    const key = `game:${state.id}`;
    if (!this.redis) {
      memoryStore.set(key, JSON.stringify(state));
      return;
    }
    await this.redis.set(key, state);
  }

  async getRoomSettings(gameId: string): Promise<RoomSettings | undefined> {
    const key = `room:${gameId}:settings`;
    if (!this.redis) {
      const raw = memoryStore.get(key);
      return raw ? (JSON.parse(raw) as RoomSettings) : undefined;
    }
    return (await this.redis.get<RoomSettings>(key)) ?? undefined;
  }

  async setRoomSettings(settings: RoomSettings) {
    const key = `room:${settings.id}:settings`;
    if (!this.redis) {
      memoryStore.set(key, JSON.stringify(settings));
      memoryStore.set(`room-index:${settings.id}`, settings.id);
      return;
    }
    await this.redis.set(key, settings);
    await this.redis.sadd("room-index", settings.id);
  }

  async deleteRoom(gameId: string) {
    const gameKey = `game:${gameId}`;
    const settingsKey = `room:${gameId}:settings`;
    if (!this.redis) {
      memoryStore.delete(gameKey);
      memoryStore.delete(settingsKey);
      memoryStore.delete(`room-index:${gameId}`);
      return;
    }
    await this.redis.del(gameKey);
    await this.redis.del(settingsKey);
    await this.redis.srem("room-index", gameId);
  }

  async listPublicRooms(): Promise<PublicRoomSummary[]> {
    const roomIds = this.redis
      ? await this.redis.smembers<string[]>("room-index")
      : [...memoryStore.keys()]
          .filter((key) => key.startsWith("room-index:"))
          .map((key) => key.slice("room-index:".length));

    const rooms = await Promise.all(
      roomIds.map(async (id) => {
        const settings = await this.getRoomSettings(id);
        const game = await this.getGame(id);
        if (!settings || !game) {
          await this.deleteRoom(id);
          return undefined;
        }
        const ownerId = settings.ownerPlayerId ?? game.players[0]?.id;
        const ownerPlayer = ownerId ? game.players.find((player) => player.id === ownerId) : undefined;
        if (game.status === "LOBBY" && ownerPlayer && !ownerPlayer.connected) {
          await this.deleteRoom(id);
          return undefined;
        }
        return {
          id,
          name: settings.name,
          maxPlayers: settings.maxPlayers,
          connectedPlayers: game.players.filter((player) => player.connected).length,
          alivePlayers: game.players.filter((player) => player.alive).length,
          drawPileCount: game.drawPile.length,
          expansions: settings.expansions,
          isPrivate: settings.isPrivate,
          status: game.status,
          updatedAt: game.updatedAt,
        } satisfies PublicRoomSummary;
      }),
    );

    return rooms
      .filter((room): room is PublicRoomSummary => Boolean(room))
      .sort((first, second) => second.updatedAt - first.updatedAt);
  }

  async withLock<T>(gameId: string, fn: () => Promise<T>): Promise<T> {
    const lockKey = `lock:game:${gameId}`;
    const lockValue = crypto.randomUUID();
    const ttlMs = 8000;

    if (!this.redis) {
      const now = Date.now();
      const lockedUntil = memoryLocks.get(lockKey) ?? 0;
      if (lockedUntil > now) throw new Error("Máy chủ đang xử lý yêu cầu khác. Đang thử lại…");
      memoryLocks.set(lockKey, now + ttlMs);
      try {
        return await fn();
      } finally {
        memoryLocks.delete(lockKey);
      }
    }

    const locked = await this.redis.set(lockKey, lockValue, {
      nx: true,
      px: ttlMs,
    });
    if (locked !== "OK") throw new Error("Máy chủ đang xử lý yêu cầu khác. Đang thử lại…");

    try {
      return await fn();
    } finally {
      const current = await this.redis.get<string>(lockKey);
      if (current === lockValue) await this.redis.del(lockKey);
    }
  }
}
