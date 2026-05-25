import { NextResponse } from "next/server";
import { z } from "zod";

export const cardExpansionSchema = z.enum([
  "BASE",
  "IMPLODING",
  "STREAKING",
  "BARKING",
  "ZOMBIE",
  "GOOD_VS_EVIL",
  "RECIPES",
]);

const idSchema = z.string().trim().min(1).max(64);
const nameSchema = z.string().trim().min(1).max(40);
const optionalNameSchema = z.string().trim().max(80).optional();
const passwordSchema = z.string().max(128).optional();

export const defaultExpansions = [
  "BASE",
  "IMPLODING",
  "STREAKING",
  "BARKING",
  "ZOMBIE",
  "GOOD_VS_EVIL",
] as const;

export const createRoomSchema = z.object({
  roomId: z.string().trim().max(16).optional(),
  roomName: optionalNameSchema,
  playerId: idSchema,
  playerName: nameSchema.optional(),
  maxPlayers: z.coerce.number().int().min(2).max(8).optional(),
  targetDeckSize: z.coerce.number().int().min(1).max(120).optional(),
  password: passwordSchema,
  expansions: z.array(cardExpansionSchema).min(1).max(7).optional(),
});

const baseGameActionSchema = z.object({
  action: z.enum([
    "create",
    "join",
    "start",
    "draw",
    "play",
    "catCombo",
    "nope",
    "resolve",
    "confirmAlterOrder",
    "confirmBury",
    "confirmShuffle",
    "confirmShareFuture",
    "confirmDefuseExplosion",
    "confirmCatSteal",
    "shuffleMyHand",
    "leave",
    "heartbeat",
  ]),
  players: z.array(z.object({ id: idSchema, name: nameSchema })).min(1).max(8).optional(),
  playerId: idSchema.optional(),
  playerName: nameSchema.optional(),
  cardInstanceId: idSchema.optional(),
  cardInstanceIds: z.array(idSchema).max(8).optional(),
  orderedInstanceIds: z.array(idSchema).max(10).optional(),
  insertIndex: z.coerce.number().int().min(0).max(120).optional(),
  stolenCardInstanceId: idSchema.optional(),
  targetPlayerId: idSchema.optional(),
  expansions: z.array(cardExpansionSchema).min(1).max(7).optional(),
  forceNew: z.boolean().optional(),
  maxPlayers: z.coerce.number().int().min(2).max(8).optional(),
  targetDeckSize: z.coerce.number().int().min(1).max(120).optional(),
  roomName: optionalNameSchema,
  password: passwordSchema,
});

export const gameActionSchema = baseGameActionSchema.superRefine((body, ctx) => {
  const requireField = (field: keyof typeof body) => {
    if (!body[field]) {
      ctx.addIssue({ code: "custom", path: [field], message: `${String(field)} is required` });
    }
  };

  if (["join", "start", "draw", "confirmShuffle", "shuffleMyHand", "leave", "heartbeat"].includes(body.action)) {
    requireField("playerId");
  }
  if (["play", "nope"].includes(body.action)) {
    requireField("playerId");
    requireField("cardInstanceId");
  }
  if (body.action === "catCombo") {
    requireField("playerId");
    requireField("targetPlayerId");
    if (body.cardInstanceIds?.length !== 2) {
      ctx.addIssue({ code: "custom", path: ["cardInstanceIds"], message: "exactly 2 cardInstanceIds are required" });
    }
  }
  if (["confirmAlterOrder", "confirmShareFuture"].includes(body.action)) {
    requireField("playerId");
    if (!body.orderedInstanceIds?.length) {
      ctx.addIssue({ code: "custom", path: ["orderedInstanceIds"], message: "orderedInstanceIds are required" });
    }
  }
  if (["confirmBury", "confirmDefuseExplosion"].includes(body.action)) {
    requireField("playerId");
    if (body.insertIndex === undefined) {
      ctx.addIssue({ code: "custom", path: ["insertIndex"], message: "insertIndex is required" });
    }
  }
  if (body.action === "confirmCatSteal") {
    requireField("playerId");
    requireField("stolenCardInstanceId");
  }
});

export type CreateRoomBody = z.infer<typeof createRoomSchema>;
export type GameActionBody = z.infer<typeof gameActionSchema>;

export async function parseJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    {
      error: "Invalid request payload",
      code: "VALIDATION_ERROR",
      details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    },
    { status: 400 },
  );
}

export function jsonError(error: unknown, status = 400) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "Unknown error" },
    { status },
  );
}
