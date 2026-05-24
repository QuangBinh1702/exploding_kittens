export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import {
  completeBury,
  completeDefuseExplosion,
  completeDrawAlter,
  completeShareFuturePhase,
  completeShuffle,
  completeCatSteal,
  drawCard,
  initializeGame,
  joinGame,
  markPlayerDisconnected,
  playCatCombo,
  playCard,
  playNope,
  resolvePendingAction,
  resolveTurnTimeout,
  shuffleVictimHand,
  startGame,
  toClientGameState,
  type ClientGameState,
} from "@/game-engine";
import type { CardExpansion } from "@/data/cardsData";
import { defaultExpansions, gameActionSchema, jsonError, parseJson, validationError } from "@/server/apiValidation";
import { hashRoomPassword, isLegacyRoomPasswordHash, verifyRoomPassword } from "@/server/password";
import { PusherService } from "@/server/pusherService";
import { RedisService } from "@/server/redisService";
import type { RoomSettings } from "@/server/roomTypes";

const redis = new RedisService();
const pusher = new PusherService();

function withRoomName(client: ClientGameState, settings?: RoomSettings | null): ClientGameState {
  const name = settings?.name?.trim();
  if (!name) return client;
  return { ...client, roomName: name };
}

async function publish(gameId: string) {
  const state = await redis.getGame(gameId);
  if (!state) return;
  const settings = await redis.getRoomSettings(gameId);
  await pusher.triggerGameState(gameId, withRoomName(toClientGameState(state), settings));
}

function fallbackPlayers(playerId: string, playerName: string, maxPlayers: number) {
  return [
    { id: playerId, name: playerName },
    ...Array.from({ length: maxPlayers - 1 }, (_, index) => ({
      id: `slot-${index + 2}`,
      name: `Player ${index + 2}`,
    })),
  ];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const viewerId = request.nextUrl.searchParams.get("viewerId") ?? undefined;

  try {
    const clientState = await redis.withLock(id, async () => {
      const state = await redis.getGame(id);
      if (!state) return undefined;
      const next = resolveTurnTimeout(state);
      if (next.updatedAt !== state.updatedAt) await redis.setGame(next);
      return toClientGameState(next, viewerId);
    });

    if (!clientState) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    const settings = await redis.getRoomSettings(id);
    return NextResponse.json(withRoomName(clientState, settings));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = gameActionSchema.safeParse(await parseJson(request));
  if (!payload.success) return validationError(payload.error);
  const body = payload.data;

  try {
    let roomDeleted = false;
    const result = await redis.withLock(id, async () => {
      if (body.action === "create") {
        const existing = await redis.getGame(id);
        if (existing && !body.forceNew) {
          throw new Error("Phòng đã tồn tại. Hãy vào phòng bằng mật khẩu nếu có.");
        }

        const creatorId = body.playerId ?? "p1";
        const creatorName = body.playerName ?? "Host";
        const maxPlayers = Math.min(8, Math.max(2, Math.floor(body.maxPlayers ?? 2)));
        const minimumDeckSize = maxPlayers * 5 + (maxPlayers - 1) + 1;
        const targetDeckSize = Math.min(120, Math.max(minimumDeckSize, Math.floor(body.targetDeckSize ?? 19 + maxPlayers * 5)));
        const expansions = body.expansions?.length
          ? body.expansions
          : ([...defaultExpansions] satisfies CardExpansion[]);
        const state = initializeGame({
          id,
          players: body.players ?? fallbackPlayers(creatorId, creatorName, maxPlayers),
          expansions,
          targetDeckSize,
        });
        state.ownerPlayerId = creatorId;
        state.players.forEach((player, index) => {
          player.connected = index === 0;
        });

        const now = Date.now();
        const settings: RoomSettings = {
          id,
          name: body.roomName?.trim() || `Room ${id}`,
          maxPlayers,
          targetDeckSize,
          ownerPlayerId: creatorId,
          expansions,
          isPrivate: Boolean(body.password?.trim()),
          passwordHash: body.password?.trim() ? hashRoomPassword(body.password.trim()) : undefined,
          createdAt: now,
          updatedAt: now,
        };

        await redis.setGame(state);
        await redis.setRoomSettings(settings);
        return toClientGameState(state, body.playerId);
      }

      const current = await redis.getGame(id);
      if (!current) throw new Error("Game not found");
      const settings = await redis.getRoomSettings(id);
      let next = resolveTurnTimeout(current);

      if (body.action === "join") {
        if (!body.playerId) throw new Error("playerId is required");
        const shouldRehashPassword = Boolean(
          settings?.passwordHash && body.password && isLegacyRoomPasswordHash(settings.passwordHash),
        );
        if (!verifyRoomPassword(body.password, settings?.passwordHash)) {
          throw new Error("Mật khẩu phòng không đúng.");
        }
        if (shouldRehashPassword && settings && body.password) {
          settings.passwordHash = hashRoomPassword(body.password.trim());
        }
        next = joinGame(next, body.playerId, body.playerName ?? body.playerId);
      } else if (body.action === "leave") {
        if (!body.playerId) throw new Error("playerId is required");
        const ownerId = settings?.ownerPlayerId ?? next.players[0]?.id;
        const disconnected = markPlayerDisconnected(next, body.playerId, ownerId);
        next = disconnected.state;
        if (disconnected.shouldDeleteRoom) {
          roomDeleted = true;
          await redis.deleteRoom(id);
          return undefined;
        }
        if (settings) settings.ownerPlayerId = disconnected.nextOwnerPlayerId;
      } else if (body.action === "start") {
        if (!body.playerId) throw new Error("playerId is required");
        const ownerId = settings?.ownerPlayerId ?? next.players[0]?.id;
        if (body.playerId !== ownerId) throw new Error("Chỉ chủ phòng mới được bắt đầu ván.");
        next = startGame(next, body.playerId);
      } else if (body.action === "draw") {
        if (!body.playerId) throw new Error("playerId is required");
        next = drawCard(next, body.playerId);
      } else if (body.action === "play") {
        if (!body.playerId || !body.cardInstanceId) {
          throw new Error("playerId and cardInstanceId are required");
        }
        next = playCard({
          state: next,
          playerId: body.playerId,
          cardInstanceId: body.cardInstanceId,
          targetPlayerId: body.targetPlayerId,
        });
      } else if (body.action === "catCombo") {
        if (!body.playerId || !body.targetPlayerId || body.cardInstanceIds?.length !== 2) {
          throw new Error("playerId, targetPlayerId and exactly 2 cardInstanceIds are required");
        }
        next = playCatCombo({
          state: next,
          playerId: body.playerId,
          targetPlayerId: body.targetPlayerId,
          cardInstanceIds: [body.cardInstanceIds[0], body.cardInstanceIds[1]],
        });
      } else if (body.action === "nope") {
        if (!body.playerId || !body.cardInstanceId) {
          throw new Error("playerId and cardInstanceId are required");
        }
        next = playNope(next, body.playerId, body.cardInstanceId);
      } else if (body.action === "resolve") {
        next = resolvePendingAction(next);
      } else if (body.action === "confirmAlterOrder") {
        if (!body.playerId || !body.orderedInstanceIds?.length) {
          throw new Error("playerId and orderedInstanceIds are required");
        }
        next = completeDrawAlter({
          state: next,
          playerId: body.playerId,
          orderedInstanceIds: body.orderedInstanceIds,
        });
      } else if (body.action === "confirmBury") {
        if (!body.playerId || body.insertIndex === undefined) {
          throw new Error("playerId and insertIndex are required");
        }
        next = completeBury({ state: next, playerId: body.playerId, insertIndex: body.insertIndex });
      } else if (body.action === "confirmShuffle") {
        if (!body.playerId) throw new Error("playerId is required");
        next = completeShuffle({ state: next, playerId: body.playerId });
      } else if (body.action === "confirmShareFuture") {
        if (!body.playerId || !body.orderedInstanceIds?.length) {
          throw new Error("playerId and orderedInstanceIds are required");
        }
        next = completeShareFuturePhase({
          state: next,
          playerId: body.playerId,
          orderedInstanceIds: body.orderedInstanceIds,
        });
      } else if (body.action === "confirmDefuseExplosion") {
        if (!body.playerId || body.insertIndex === undefined) {
          throw new Error("playerId and insertIndex are required");
        }
        next = completeDefuseExplosion({
          state: next,
          playerId: body.playerId,
          insertIndex: body.insertIndex,
        });
      } else if (body.action === "confirmCatSteal") {
        if (!body.playerId || !body.stolenCardInstanceId) {
          throw new Error("playerId and stolenCardInstanceId are required");
        }
        next = completeCatSteal({
          state: next,
          playerId: body.playerId,
          stolenCardInstanceId: body.stolenCardInstanceId,
        });
      } else if (body.action === "shuffleMyHand") {
        if (!body.playerId) throw new Error("playerId is required");
        next = shuffleVictimHand({ state: next, playerId: body.playerId });
      }

      if (settings) {
        settings.updatedAt = Date.now();
        await redis.setRoomSettings(settings);
      }
      await redis.setGame(next);
      return toClientGameState(next, body.playerId);
    });

    if (roomDeleted) return NextResponse.json({ deleted: true });
    if (!result) return NextResponse.json({ error: "Game not found" }, { status: 404 });
    await publish(id);
    const settingsAfter = await redis.getRoomSettings(id);
    return NextResponse.json(withRoomName(result, settingsAfter));
  } catch (error) {
    return jsonError(error);
  }
}
