export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type { CardExpansion } from "@/data/cardsData";
import { initializeGame, toClientGameState } from "@/game-engine";
import { createRoomSchema, defaultExpansions, jsonError, parseJson, validationError } from "@/server/apiValidation";
import { hashRoomPassword } from "@/server/password";
import { RedisService } from "@/server/redisService";
import type { RoomSettings } from "@/server/roomTypes";

const redis = new RedisService();

function cleanRoomId(input: string) {
  return input.replace(/[^A-Z0-9-]/gi, "").toUpperCase().slice(0, 16);
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const rooms = await redis.listPublicRooms();
  const filtered =
    q.length === 0
      ? rooms
      : rooms.filter(
          (room) =>
            room.name.toLowerCase().includes(q) || room.id.toLowerCase().includes(q),
        );
  return NextResponse.json({ rooms: filtered });
}

export async function POST(request: NextRequest) {
  const payload = createRoomSchema.safeParse(await parseJson(request));
  if (!payload.success) return validationError(payload.error);

  const body = payload.data;
  const id = cleanRoomId(body.roomId || Math.random().toString(36).slice(2, 8));
  if (!id) return NextResponse.json({ error: "roomId is required" }, { status: 400 });

  try {
    const result = await redis.withLock(id, async () => {
      const existing = await redis.getGame(id);
      if (existing) throw new Error("Room already exists.");

      const maxPlayers = Math.min(8, Math.max(2, Math.floor(body.maxPlayers ?? 2)));
      const minimumDeckSize = maxPlayers * 5 + (maxPlayers - 1) + 1;
      const targetDeckSize = Math.min(120, Math.max(minimumDeckSize, Math.floor(body.targetDeckSize ?? 19 + maxPlayers * 5)));
      const players = [
        { id: body.playerId!, name: body.playerName || "Host" },
        ...Array.from({ length: maxPlayers - 1 }, (_, index) => ({
          id: `slot-${index + 2}`,
          name: `Player ${index + 2}`,
        })),
      ];
      const expansions = body.expansions?.length
        ? body.expansions
        : ([...defaultExpansions] satisfies CardExpansion[]);
      const state = initializeGame({ id, players, expansions, targetDeckSize });
      state.ownerPlayerId = body.playerId!;
      state.players.forEach((player, index) => {
        player.connected = index === 0;
      });

      const now = Date.now();
      const settings: RoomSettings = {
        id,
        name: body.roomName?.trim() || `Room ${id}`,
        maxPlayers,
        targetDeckSize,
        ownerPlayerId: body.playerId!,
        expansions,
        isPrivate: Boolean(body.password?.trim()),
        passwordHash: body.password?.trim() ? hashRoomPassword(body.password.trim()) : undefined,
        createdAt: now,
        updatedAt: now,
      };

      await redis.setGame(state);
      await redis.setRoomSettings(settings);
      return toClientGameState(state, body.playerId);
    });

    return NextResponse.json({ roomId: id, game: result });
  } catch (error) {
    return jsonError(error);
  }
}
