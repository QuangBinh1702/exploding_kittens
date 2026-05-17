import { describe, expect, it } from "vitest";
import { getCardData } from "@/data/cardsData";
import {
  completeCatSteal,
  completeDefuseExplosion,
  completeDrawAlter,
  completeShuffle,
  drawCard,
  getCardBaseId,
  initializeGame,
  joinGame,
  playCatCombo,
  playCard,
  playNope,
  resolvePendingAction,
  resolveTurnTimeout,
  startGame,
  toClientGameState,
} from "./engine";

const players = [
  { id: "p1", name: "A" },
  { id: "p2", name: "B" },
  { id: "p3", name: "C" },
];

describe("game engine", () => {
  function startedGame(inputPlayers = players.slice(0, 2), now = 1000) {
    const state = initializeGame({ id: "test", players: inputPlayers, random: () => 0.42 });
    return startGame(state, inputPlayers[0].id, now);
  }

  it("puts exactly N-1 exploding kittens in the draw pile", () => {
    const two = initializeGame({ id: "test", players: players.slice(0, 2), random: () => 0.42 });
    expect(two.drawPile.filter((c) => getCardBaseId(c) === "exploding-kitten")).toHaveLength(1);
    const three = initializeGame({ id: "test", players, random: () => 0.42 });
    expect(three.drawPile.filter((c) => getCardBaseId(c) === "exploding-kitten")).toHaveLength(2);
  });

  it("initializes as a lobby without exposing hands or starting the turn timer", () => {
    const state = initializeGame({ id: "test", players, random: () => 0.42 });

    expect(state.status).toBe("LOBBY");
    expect(state.players).toHaveLength(3);
    expect(state.players.every((player) => player.connected)).toBe(true);
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true);
    expect(state.players.every((player) => player.hand.some((card) => getCardBaseId(card) === "defuse"))).toBe(true);
    expect(state.drawPile.filter((card) => getCardBaseId(card) === "exploding-kitten")).toHaveLength(2);
    expect(state.turnExpiresAt).toBe(0);

    const client = toClientGameState(state, "p1");
    expect(client.players.find((player) => player.id === "p1")?.hand).toBeUndefined();
    expect(client.players.find((player) => player.id === "p2")?.hand).toBeUndefined();
  });

  it("starts a lobby only after at least 2 connected players and then exposes the current player's hand", () => {
    const lobby = initializeGame({ id: "test", players: players.slice(0, 2), random: () => 0.42 });
    lobby.players[1].connected = false;
    expect(() => startGame(lobby, "p1", 1000)).toThrow("Cần ít nhất 2 người chơi");

    const joined = joinGame(lobby, "p2", "B");
    const started = startGame(joined, "p1", 2000);
    expect(started.status).toBe("PLAYING");
    expect(started.turnExpiresAt - started.turnStartedAt).toBe(30000);
    expect(toClientGameState(started, "p1").players.find((player) => player.id === "p1")?.hand).toHaveLength(5);
  });

  it("joins an existing player slot by id", () => {
    const state = initializeGame({ id: "test", players, random: () => 0.42 });
    state.players[1].connected = false;
    const joined = joinGame(state, "p2", "Linh");
    expect(joined.players[1].name).toBe("Linh");
    expect(joined.log.at(-1)).toContain("đã vào phòng");
  });

  it("does not log enter again when the same player reconnects", () => {
    const state = initializeGame({ id: "test", players, random: () => 0.42 });
    state.players[1].connected = false;
    const joined = joinGame(state, "p2", "Linh");
    const enterCount = joined.log.filter((line) => line.includes("đã vào phòng")).length;
    const again = joinGame(joined, "p2", "Linh 2");
    expect(again.players[1].name).toBe("Linh 2");
    expect(again.log.filter((line) => line.includes("đã vào phòng"))).toHaveLength(enterCount);
  });

  it("resets turn timer after playing a nopeable card (still same turn)", () => {
    const game = startedGame(players.slice(0, 2), 20_000);
    const p1 = game.players[0];
    const nopeableId = p1.hand.find((c) => getCardData(getCardBaseId(c))?.nopeable);
    expect(nopeableId).toBeDefined();
    if (!nopeableId) return;
    const before = game.turnExpiresAt;
    const after = playCard({ state: game, playerId: p1.id, cardInstanceId: nopeableId, now: 25_000 });
    expect(after.turnExpiresAt).toBe(55_000);
    expect(after.turnExpiresAt).toBeGreaterThan(before);
  });

  it("assigns a new browser player id to an empty room slot", () => {
    const state = initializeGame({ id: "test", players, random: () => 0.42 });
    state.players[1].connected = false;
    const joined = joinGame(state, "browser-2", "Bob");
    expect(joined.players[1].id).toBe("browser-2");
    expect(joined.players[1].name).toBe("Bob");
    expect(joined.players[1].hand).toHaveLength(5);
  });

  it("draws exploding kitten and consumes defuse instead of eliminating player", () => {
    const state = startedGame(players.slice(0, 2));
    const current = state.players[0];
    state.drawPile.push("exploding-kitten#manual");

    const next = drawCard(state, current.id, false, 5000);
    expect(next.players[0].alive).toBe(true);
    expect(next.players[0].hand.some((card) => getCardBaseId(card) === "defuse")).toBe(true);
    expect(next.pendingDefuseExplosion).toEqual({
      playerId: current.id,
      explodingCardInstanceId: "exploding-kitten#manual",
    });
    expect(next.drawPile.some((card) => card === "exploding-kitten#manual")).toBe(false);

    const buried = completeDefuseExplosion({ state: next, playerId: current.id, insertIndex: 0, now: 6000 });
    expect(buried.players[0].hand.some((card) => getCardBaseId(card) === "defuse")).toBe(false);
    expect(buried.drawPile.some((card) => card === "exploding-kitten#manual")).toBe(true);
    expect(buried.pendingDefuseExplosion).toBeUndefined();
  });

  it("creates a wait-for-nope prompt and resolves odd Nope as cancel", () => {
    const state = startedGame(players.slice(0, 2));
    const current = state.players[0];
    const attack = "attack#manual";
    current.hand.push(attack);
    const nopeOwner = state.players[1];
    nopeOwner.hand.push("nope#manual");

    const pending = playCard({
      state,
      playerId: current.id,
      cardInstanceId: attack,
      now: 1000,
    });
    expect(pending.actionPrompt).toBe("WAITING_FOR_NOPE");

    const noped = playNope(pending, nopeOwner.id, "nope#manual", 2000);
    const resolved = resolvePendingAction(noped, 8000);
    expect(resolved.actionPrompt).toBeUndefined();
    expect(resolved.log.at(-1)).toContain("bị hủy");
  });

  it("queues shuffle after Nope window until the player confirms", () => {
    const state = startedGame(players.slice(0, 2));
    const drawOrderBefore = [...state.drawPile];
    state.players[0].hand.push("shuffle#manual");
    const pending = playCard({ state, playerId: "p1", cardInstanceId: "shuffle#manual", now: 1000 });
    const resolved = resolvePendingAction(pending, 7000);
    expect(resolved.actionPrompt).toBeUndefined();
    expect(resolved.pendingShuffle).toEqual({ playerId: "p1" });
    expect(resolved.drawPile).toEqual(drawOrderBefore);
    expect(resolved.insights.some((insight) => insight.title === "Xào bài")).toBe(true);

    const shuffled = completeShuffle({ state: resolved, playerId: "p1", random: () => 0.5, now: 8000 });
    expect(shuffled.pendingShuffle).toBeUndefined();
    expect(shuffled.log.join(" ")).toContain("xào xấp rút");
  });

  it("reveals the requested number of future cards privately", () => {
    const state = startedGame(players.slice(0, 2));
    state.players[0].hand.push("see-the-future-5x#manual");
    const pending = playCard({ state, playerId: "p1", cardInstanceId: "see-the-future-5x#manual", now: 1000 });
    const resolved = resolvePendingAction(pending, 7000);
    const client = toClientGameState(resolved, "p1");
    expect(client.insight?.cards).toHaveLength(5);
    expect(toClientGameState(resolved, "p2").insight).toBeUndefined();
  });

  it("lets stealer pick a card after a valid two-cat combo (matching cats)", () => {
    const state = startedGame(players.slice(0, 2));
    state.players[0].hand.push("tacocat#manual-1", "tacocat#manual-2");
    const targetHandCount = state.players[1].hand.length;
    const chosen = state.players[1].hand[0];

    const afterCombo = playCatCombo({
      state,
      playerId: "p1",
      targetPlayerId: "p2",
      cardInstanceIds: ["tacocat#manual-1", "tacocat#manual-2"],
      now: 9000,
    });

    expect(afterCombo.pendingCatSteal).toEqual({ playerId: "p1", targetPlayerId: "p2" });
    expect(afterCombo.players[0].hand).not.toContain("tacocat#manual-1");
    expect(afterCombo.players[0].hand).not.toContain("tacocat#manual-2");
    expect(afterCombo.players[1].hand).toHaveLength(targetHandCount);
    expect(afterCombo.discardPile).toEqual(expect.arrayContaining(["tacocat#manual-1", "tacocat#manual-2"]));

    const done = completeCatSteal({
      state: afterCombo,
      playerId: "p1",
      stolenCardInstanceId: chosen,
      now: 9100,
    });
    expect(done.pendingCatSteal).toBeUndefined();
    expect(done.players[1].hand).toHaveLength(targetHandCount - 1);
    expect(done.players[0].hand).toContain(chosen);
    expect(toClientGameState(done, "p1").insight?.cards).toHaveLength(1);
  });

  it("rejects cat combo when the two cats do not match", () => {
    const state = startedGame(players.slice(0, 2));
    state.players[0].hand.push("tacocat#manual-1", "beard-cat#manual-2");
    expect(() =>
      playCatCombo({
        state,
        playerId: "p1",
        targetPlayerId: "p2",
        cardInstanceIds: ["tacocat#manual-1", "beard-cat#manual-2"],
      }),
    ).toThrow();
  });

  it("accepts feral cat paired with any normal cat", () => {
    const state = startedGame(players.slice(0, 2));
    state.players[0].hand.push("beard-cat#b1", "feral-cat#f1");
    const chosen = state.players[1].hand[0];
    const afterCombo = playCatCombo({
      state,
      playerId: "p1",
      targetPlayerId: "p2",
      cardInstanceIds: ["beard-cat#b1", "feral-cat#f1"],
    });
    expect(afterCombo.pendingCatSteal).toEqual({ playerId: "p1", targetPlayerId: "p2" });
    const done = completeCatSteal({ state: afterCombo, playerId: "p1", stolenCardInstanceId: chosen });
    expect(done.discardPile).toEqual(expect.arrayContaining(["beard-cat#b1", "feral-cat#f1"]));
    expect(done.pendingCatSteal).toBeUndefined();
  });

  it("queues reorder after Alter the Future resolves and applies confirmed order", () => {
    const state = startedGame(players.slice(0, 2));
    state.drawPile = ["a#1", "b#2", "c#3", "d#4"];
    state.players[0].hand.push("alter-the-future-3x#manual");
    const pending = playCard({ state, playerId: "p1", cardInstanceId: "alter-the-future-3x#manual", now: 1000 });
    const resolved = resolvePendingAction(pending, 7000);
    expect(resolved.pendingDrawAlter).toEqual({ playerId: "p1", count: 3 });
    expect(resolved.insights.find((i) => i.playerId === "p1")?.reorderDrawTop).toEqual(["d#4", "c#3", "b#2"]);

    const reordered = completeDrawAlter({
      state: resolved,
      playerId: "p1",
      orderedInstanceIds: ["b#2", "d#4", "c#3"],
    });
    expect(reordered.drawPile).toEqual(["a#1", "c#3", "d#4", "b#2"]);
    expect(reordered.pendingDrawAlter).toBeUndefined();
  });

  it("does not auto-draw when Alter reorder is still pending", () => {
    const state = startedGame(players.slice(0, 2));
    state.drawPile = ["a#1", "b#2", "c#3", "d#4"];
    state.players[0].hand.push("alter-the-future-3x#manual");
    const pending = playCard({ state, playerId: "p1", cardInstanceId: "alter-the-future-3x#manual", now: 1000 });
    const resolved = resolvePendingAction(pending, 7000);
    const afterTimeout = resolveTurnTimeout(resolved, resolved.turnExpiresAt + 99999);
    expect(afterTimeout.currentPlayerIndex).toBe(resolved.currentPlayerIndex);
    expect(afterTimeout.players[0].hand.length).toBe(resolved.players[0].hand.length);
  });

  it("auto draws when the 30 second turn timer expires", () => {
    const state = startedGame(players.slice(0, 2));
    const handCount = state.players[0].hand.length;
    const resolved = resolveTurnTimeout(state, state.turnExpiresAt + 1);
    expect(resolved.players[0].hand.length).toBeGreaterThanOrEqual(handCount);
    expect(resolved.currentPlayerIndex).toBe(1);
  });
});
