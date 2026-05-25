import { describe, expect, it } from "vitest";
import { RedisService } from "./redisService";
import type { ServerGameState } from "@/game-engine";
import type { RoomSettings } from "./roomTypes";

function makeGame(updatedAt: number): ServerGameState {
  return {
    id: `stale-${updatedAt}`,
    status: "LOBBY",
    ownerPlayerId: "p1",
    targetDeckSize: 29,
    players: [
      { id: "p1", name: "Host", hand: [], alive: true, connected: true },
      { id: "slot-2", name: "Player 2", hand: [], alive: true, connected: false },
    ],
    drawPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    direction: 1,
    pendingTurns: 1,
    turnStartedAt: updatedAt,
    turnExpiresAt: 0,
    insights: [],
    expansions: ["BASE"],
    log: [],
    updatedAt,
  };
}

function makeSettings(id: string, updatedAt: number): RoomSettings {
  return {
    id,
    name: "Stale room",
    maxPlayers: 2,
    targetDeckSize: 29,
    ownerPlayerId: "p1",
    expansions: ["BASE"],
    isPrivate: false,
    createdAt: updatedAt,
    updatedAt,
  };
}

describe("RedisService public room listing", () => {
  it("lists rooms that have a recently active connected player", async () => {
    const redis = new RedisService();
    const now = 10_000;
    const game = makeGame(now);
    game.id = "active-room";
    game.players[0].lastSeenAt = now;
    const settings = makeSettings(game.id, now);

    await redis.setGame(game);
    await redis.setRoomSettings(settings);

    const rooms = (await redis.listPublicRooms(now + 20_000)).filter((room) => room.id === game.id);

    expect(rooms).toHaveLength(1);
    expect(rooms[0].connectedPlayers).toBe(1);
  });

  it("does not list rooms whose only connected player has no recent presence", async () => {
    const redis = new RedisService();
    const staleUpdatedAt = 1_000;
    const game = makeGame(staleUpdatedAt);
    const settings = makeSettings(game.id, staleUpdatedAt);

    await redis.setGame(game);
    await redis.setRoomSettings(settings);

    const rooms = (await redis.listPublicRooms(staleUpdatedAt + 46_000)).filter((room) => room.id === game.id);

    expect(rooms).toHaveLength(0);
    expect(await redis.getGame(game.id)).toBeUndefined();
  });

  it("does not list rooms after every player has left", async () => {
    const redis = new RedisService();
    const now = 20_000;
    const game = makeGame(now);
    game.id = "empty-room";
    game.players.forEach((player) => {
      player.connected = false;
      player.lastSeenAt = undefined;
    });
    const settings = makeSettings(game.id, now);

    await redis.setGame(game);
    await redis.setRoomSettings(settings);

    const rooms = (await redis.listPublicRooms(now)).filter((room) => room.id === game.id);

    expect(rooms).toHaveLength(0);
    expect(await redis.getGame(game.id)).toBeUndefined();
  });
});
