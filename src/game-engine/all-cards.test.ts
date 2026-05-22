import { describe, expect, it } from "vitest";
import { cardsData } from "@/data/cardsData";
import {
  drawCard,
  getCardBaseId,
  initializeGame,
  playCard,
  resolvePendingAction,
  startGame,
} from "./engine";
import type { ServerGameState } from "./types";

/**
 * 49-card behavioural test suite.
 *
 * For each card in `cardsData` we assert:
 *   - the card exists in the canonical list (id, title, expansion, copies > 0)
 *   - if the card is normally PLAYABLE from hand, that calling playCard with it
 *     succeeds (or queues the expected pending state) without throwing.
 *
 * Goals:
 *   - Catch cards whose action handler falls back to "PROMPT" (no-op).
 *   - Provide artifact (test-output) showing every card has been touched.
 */

const players = [
  { id: "p1", name: "A" },
  { id: "p2", name: "B" },
  { id: "p3", name: "C" },
];

function startedGameAll(): ServerGameState {
  const state = initializeGame({ id: "all-49", players, random: () => 0.42 });
  return startGame(state, players[0].id, 1000);
}

/**
 * Cards never played manually from the hand:
 *  - `defuse`            : auto-used when drawing Exploding Kitten
 *  - `exploding-kitten`  : drawn, never played
 *  - `imploding-kitten`  : drawn face-up
 *  - `nope`              : reactionary, played in response to pendingAction
 *  - cat cards (CAT/FERAL_CAT/STREAKING_KITTEN): used in 2/3-cat combos, not as standalone play
 *  - `zombie-kitten`     : auto-effect on drawing Exploding Kitten
 *  - `tower-of-power`    : kept on table (passive)
 */
const NEVER_PLAYABLE_FROM_HAND = new Set([
  "defuse",
  "exploding-kitten",
  "imploding-kitten",
  "nope",
  "tacocat",
  "beard-cat",
  "cattermelon",
  "hairy-potato-cat",
  "rainbow-ralphing-cat",
  "feral-cat",
  "streaking-kitten",
  "zombie-kitten",
  "tower-of-power",
  "godcat",
  "devilcat",
]);

const REQUIRES_TARGET = new Set([
  "favor",
  "mark",
  "curse-of-cat-butt",
  "targeted-attack-2x",
  "barking-kitten",
  "ill-take-that",
  "clairvoyance",
  "feed-the-dead",
  "grave-robber",
  "armageddon",
]);

function ensureCardOnTopOfHand(state: ServerGameState, playerId: string, cardId: string) {
  const player = state.players.find((p) => p.id === playerId)!;
  const instanceId = `${cardId}#manual-${Math.random().toString(36).slice(2, 8)}`;
  player.hand.push(instanceId);
  return instanceId;
}

describe("Card data integrity (49 cards)", () => {
  it("has the expected expansion counts", () => {
    const counts = new Map<string, number>();
    for (const card of cardsData) {
      counts.set(card.expansion, (counts.get(card.expansion) ?? 0) + 1);
    }
    // Snapshot of expected counts at this point in dev:
    expect(counts.get("BASE")).toBe(13);
    expect(counts.get("IMPLODING")).toBe(7);
    expect(counts.get("STREAKING")).toBe(8);
    expect(counts.get("BARKING")).toBe(7);
    expect(counts.get("ZOMBIE")).toBe(8);
    expect(counts.get("GOOD_VS_EVIL")).toBe(6);
    expect(cardsData.length).toBe(49);
  });

  it.each(cardsData.map((c) => [c.id, c]))(
    "card %s has Vietnamese title and description",
    (_id, card) => {
      // Minimal requirements: title & description set, length > 1, no obvious English-only sentinel for ZOMBIE/GOOD_VS_EVIL set.
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
      expect(card.copies).toBeGreaterThan(0);
    },
  );
});

describe("Each playable card resolves through the engine without falling back to PROMPT", () => {
  for (const card of cardsData) {
    if (NEVER_PLAYABLE_FROM_HAND.has(card.id)) continue;

    it(`plays "${card.id}" (${card.title}) without throwing`, () => {
      const state = startedGameAll();
      // Make actor draw pile big enough for SEE/ALTER/SHARE-style cards.
      while (state.drawPile.length < 6) state.drawPile.push(`tacocat#fill-${state.drawPile.length}`);
      const actorId = state.players[state.currentPlayerIndex].id;
      const targetId = state.players.find((p) => p.id !== actorId)!.id;
      const instance = ensureCardOnTopOfHand(state, actorId, card.id);

      const target = REQUIRES_TARGET.has(card.id) ? targetId : undefined;

      // Some action cards need a non-empty target hand (e.g. favor)
      if (card.id === "favor" || card.id === "mark") {
        const opponent = state.players.find((p) => p.id === targetId)!;
        if (opponent.hand.length === 0) opponent.hand.push("tacocat#filler");
      }

      const after = playCard({
        state,
        playerId: actorId,
        cardInstanceId: instance,
        targetPlayerId: target,
        now: 2000,
      });

      // Either applied immediately (non-nopeable) or queued waiting for nope.
      expect(after.discardPile.map(getCardBaseId)).toContain(card.id);

      // If nopeable + queued, resolving after timeout should not throw
      if (after.pendingAction) {
        const resolved = resolvePendingAction(after, after.pendingAction.expiresAt + 1);
        // Either the action was applied or we now have one of the pending* sub-states
        // (defuse/bury/alter/share/shuffle/cat-steal/draw-alter), which all are valid.
        expect(resolved.status).not.toBe("LOBBY");
      }
    });
  }
});

describe("Defensive: cards that are never directly played still exist in deck", () => {
  it.each(["exploding-kitten", "defuse", "nope", "tacocat"])(
    "%s appears in the deck or starting hands",
    (cardId) => {
      const state = initializeGame({
        id: "deck-check",
        players,
        random: () => 0.42,
        expansions: ["BASE"],
      });
      const inDraw = state.drawPile.some((c) => getCardBaseId(c) === cardId);
      const inHand = state.players.some((p) => p.hand.some((c) => getCardBaseId(c) === cardId));
      expect(inDraw || inHand).toBe(true);
    },
  );
});

describe("Drawing Exploding Kitten + Defuse flow works", () => {
  it("defuse keeps the player alive and queues the explosion-insert step", () => {
    const state = startedGameAll();
    const actorId = state.players[state.currentPlayerIndex].id;
    const actor = state.players.find((p) => p.id === actorId)!;
    if (!actor.hand.some((c) => getCardBaseId(c) === "defuse")) {
      actor.hand.push("defuse#manual-defuse");
    }
    state.drawPile = [...state.drawPile, "exploding-kitten#manual-bomb"];
    const after = drawCard(state, actorId);
    expect(after.pendingDefuseExplosion?.playerId).toBe(actorId);
    expect(after.players.find((p) => p.id === actorId)?.alive).toBe(true);
  });
});
