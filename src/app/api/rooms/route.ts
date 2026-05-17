import { NextRequest, NextResponse } from "next/server";
import type { CardExpansion } from "@/data/cardsData";
import { initializeGame, toClientGameState } from "@/game-engine";
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
  const body = (await request.json()) as {
    roomId?: string;
    roomName?: string;
    playerId?: string;
    playerName?: string;
    maxPlayers?: number;
    password?: string;
    expansions?: CardExpansion[];
  };

  const id = cleanRoomId(body.roomId || Math.random().toString(36).slice(2, 8));
  if (!id) return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  if (!body.playerId) return NextResponse.json({ error: "playerId is required" }, { status: 400 });

  try {
    const result = await redis.withLock(id, async () => {
      const existing = await redis.getGame(id);
      if (existing) throw new Error("Phòng đã tồn tại.");

      const maxPlayers = 2;
      const players = [
        { id: body.playerId!, name: body.playerName || "Chủ phòng" },
        { id: `slot-2`, name: "Người chơi 2" },
      ];
      const expansions = body.expansions?.length
        ? body.expansions
        : (["BASE", "IMPLODING", "STREAKING", "BARKING"] satisfies CardExpansion[]);
      const state = initializeGame({ id, players, expansions });
      state.ownerPlayerId = body.playerId!;
      state.players.forEach((player, index) => {
        player.connected = index === 0;
      });

      const now = Date.now();
      const settings: RoomSettings = {
        id,
        name: body.roomName?.trim() || `Phòng ${id}`,
        maxPlayers,
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 400 },
    );
  }
}
