import { describe, expect, it } from "vitest";
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

  it.each([
    [2, 29],
    [3, 34],
    [4, 39],
    [5, 44],
    [6, 49],
    [7, 54],
    [8, 59],
  ])("uses a player-scaled initial deck for %i players", (playerCount, expectedTotalCards) => {
    const inputPlayers = Array.from({ length: playerCount }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
    }));

    const state = initializeGame({
      id: `scaled-${playerCount}`,
      players: inputPlayers,
      expansions: ["BASE", "IMPLODING", "STREAKING", "BARKING", "ZOMBIE", "GOOD_VS_EVIL"],
      random: () => 0.42,
    });

    const hands = state.players.flatMap((player) => player.hand);
    const allCards = [...hands, ...state.drawPile];
    expect(allCards).toHaveLength(expectedTotalCards);
    expect(state.players.every((player) => player.hand.length === 5)).toBe(true);
    expect(state.drawPile.filter((card) => getCardBaseId(card) === "exploding-kitten")).toHaveLength(playerCount - 1);
    expect(hands.filter((card) => getCardBaseId(card) === "defuse")).toHaveLength(playerCount);
    expect(state.drawPile.filter((card) => getCardBaseId(card) === "defuse")).toHaveLength(1);
    expect(state.log.at(-1)).toContain(`${expectedTotalCards} lá`);
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
    p1.hand.push("skip#timer-test");
    const nopeableId = "skip#timer-test";
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

  it("uses Zombie Kitten as explosion protection and revives an eliminated player", () => {
    const state = startedGame(players.slice(0, 3));
    state.players[0].hand = ["zombie-kitten#z1", "skip#gift"];
    state.players[1].alive = false;
    state.players[1].hand = [];
    state.drawPile.push("exploding-kitten#boom");

    const pending = drawCard(state, "p1", false, 5000);
    expect(pending.pendingDefuseExplosion?.explodingCardInstanceId).toBe("exploding-kitten#boom");

    const resolved = completeDefuseExplosion({ state: pending, playerId: "p1", insertIndex: 0, now: 6000 });
    expect(resolved.players[0].hand).not.toContain("zombie-kitten#z1");
    expect(resolved.players[1].alive).toBe(true);
    expect(resolved.players[1].hand).toContain("skip#gift");
  });

  it("applies several new expansion actions", () => {
    const state = startedGame(players.slice(0, 3));
    state.players[2].alive = false;
    state.players[0].hand.push("attack-of-the-dead#a1", "clairvoyance#c1", "dig-deeper#d1");
    state.drawPile = ["bottom#1", "kept-top#2", "taken-second#3"];

    const attackPending = playCard({ state, playerId: "p1", cardInstanceId: "attack-of-the-dead#a1", now: 1000 });
    const attackResolved = resolvePendingAction(attackPending, 7000);
    expect(attackResolved.pendingTurns).toBeGreaterThanOrEqual(3);

    attackResolved.currentPlayerIndex = 0;
    const clairPending = playCard({
      state: attackResolved,
      playerId: "p1",
      cardInstanceId: "clairvoyance#c1",
      targetPlayerId: "p2",
      now: 8000,
    });
    const clairResolved = resolvePendingAction(clairPending, 14000);
    expect(toClientGameState(clairResolved, "p1").insight?.cards).toEqual(
      clairResolved.players[1].hand.map(getCardBaseId),
    );

    const digPending = playCard({ state: clairResolved, playerId: "p1", cardInstanceId: "dig-deeper#d1", now: 15000 });
    const digResolved = resolvePendingAction(digPending, 21000);
    expect(digResolved.players[0].hand).toContain("kept-top#2");
    expect(digResolved.drawPile.at(-1)).toBe("taken-second#3");
  });

  it("clones the previous action and handles Good vs Evil utility cards", () => {
    const state = startedGame(players.slice(0, 2));
    state.players[0].hand.push("skip#s1", "clone#c1", "godcat#g1", "devilcat#d1", "potluck#p1");
    const targetInitialHand = state.players[1].hand.length;

    const skipPending = playCard({ state, playerId: "p1", cardInstanceId: "skip#s1", now: 1000 });
    const afterSkip = resolvePendingAction(skipPending, 7000);
    afterSkip.currentPlayerIndex = 0;

    const clonePending = playCard({ state: afterSkip, playerId: "p1", cardInstanceId: "clone#c1", now: 8000 });
    const afterClone = resolvePendingAction(clonePending, 14000);
    expect(afterClone.log.join(" ")).toContain("clones");
    afterClone.currentPlayerIndex = 0;

    const afterGodcat = playCard({ state: afterClone, playerId: "p1", cardInstanceId: "godcat#g1", now: 15000 });
    expect(afterGodcat.players[0].hand.some((card) => getCardBaseId(card) === "defuse")).toBe(true);

    const devilPending = playCard({
      state: afterGodcat,
      playerId: "p1",
      cardInstanceId: "devilcat#d1",
      targetPlayerId: "p2",
      now: 16000,
    });
    const afterDevil = resolvePendingAction(devilPending, 22000);
    expect(afterDevil.players[1].hand.length).toBe(targetInitialHand - 1);

    afterDevil.currentPlayerIndex = 0;
    const potluckPending = playCard({ state: afterDevil, playerId: "p1", cardInstanceId: "potluck#p1", now: 23000 });
    const afterPotluck = resolvePendingAction(potluckPending, 29000);
    expect(afterPotluck.drawPile.length).toBeGreaterThan(afterDevil.drawPile.length);
  });

  it("handles dead-player and public-reveal expansion cards", () => {
    const state = startedGame(players.slice(0, 3));
    state.players[0].hand.push(
      "feed-the-dead#f1",
      "grave-robber#g1",
      "reveal-the-future-3x#r1",
      "raising-heck#h1",
      "armageddon#a1",
    );
    state.players[1].hand.push("godcat#safe");
    state.players[2].alive = false;
    state.players[2].hand = ["skip#dead"];
    state.drawPile = ["normal#1", "exploding-kitten#2", "normal#3", "normal#4"];

    const feedPending = playCard({ state, playerId: "p1", cardInstanceId: "feed-the-dead#f1", now: 1000 });
    const afterFeed = resolvePendingAction(feedPending, 7000);
    expect(afterFeed.players[2].hand.length).toBeGreaterThan(1);
    afterFeed.currentPlayerIndex = 0;

    const gravePending = playCard({ state: afterFeed, playerId: "p1", cardInstanceId: "grave-robber#g1", now: 8000 });
    const afterGrave = resolvePendingAction(gravePending, 14000);
    expect(afterGrave.drawPile.length).toBeGreaterThan(afterFeed.drawPile.length);
    afterGrave.currentPlayerIndex = 0;

    const revealPending = playCard({ state: afterGrave, playerId: "p1", cardInstanceId: "reveal-the-future-3x#r1", now: 15000 });
    const afterReveal = resolvePendingAction(revealPending, 21000);
    expect(toClientGameState(afterReveal, "p1").insight?.cards).toHaveLength(3);
    expect(toClientGameState(afterReveal, "p2").insight?.cards).toHaveLength(3);
    afterReveal.currentPlayerIndex = 0;

    const heckPending = playCard({ state: afterReveal, playerId: "p1", cardInstanceId: "raising-heck#h1", now: 22000 });
    const afterHeck = resolvePendingAction(heckPending, 28000);
    expect(getCardBaseId(afterHeck.drawPile[0])).toBe("exploding-kitten");
    afterHeck.currentPlayerIndex = 0;

    const armageddonPending = playCard({
      state: afterHeck,
      playerId: "p1",
      cardInstanceId: "armageddon#a1",
      targetPlayerId: "p2",
      now: 29000,
    });
    const afterArmageddon = resolvePendingAction(armageddonPending, 35000);
    expect(afterArmageddon.players.some((player) => !player.alive) || afterArmageddon.discardPile.includes("godcat#safe")).toBe(true);
  });
  it("resolves older expansion utility cards without leaving prompt-only actions", () => {
    const state = startedGame(players.slice(0, 2));
    state.players[0].hand.push(
      "favor#f1",
      "mark#m1",
      "curse-of-cat-butt#c1",
      "barking-kitten#b1",
      "tower-of-power#t1",
      "ill-take-that#i1",
    );
    state.drawPile.push("skip#future");
    const initialTargetHand = state.players[1].hand.length;

    const favorPending = playCard({ state, playerId: "p1", cardInstanceId: "favor#f1", targetPlayerId: "p2", now: 1000 });
    const afterFavor = resolvePendingAction(favorPending, 7000);
    expect(afterFavor.players[0].hand.length).toBeGreaterThan(state.players[0].hand.length - 1);
    expect(afterFavor.players[1].hand.length).toBe(initialTargetHand - 1);
    afterFavor.currentPlayerIndex = 0;

    const markPending = playCard({ state: afterFavor, playerId: "p1", cardInstanceId: "mark#m1", targetPlayerId: "p2", now: 8000 });
    const afterMark = resolvePendingAction(markPending, 14000);
    expect(toClientGameState(afterMark, "p1").insight?.title).toContain("Marked");
    afterMark.currentPlayerIndex = 0;

    const cursePending = playCard({ state: afterMark, playerId: "p1", cardInstanceId: "curse-of-cat-butt#c1", targetPlayerId: "p2", now: 15000 });
    const afterCurse = resolvePendingAction(cursePending, 21000);
    expect(toClientGameState(afterCurse, "p2").insight?.title).toBe("Curse of Cat Butt");
    afterCurse.currentPlayerIndex = 0;

    const beforeBarkActorHand = afterCurse.players[0].hand.length;
    const barkPending = playCard({ state: afterCurse, playerId: "p1", cardInstanceId: "barking-kitten#b1", targetPlayerId: "p2", now: 22000 });
    const afterBark = resolvePendingAction(barkPending, 28000);
    expect(afterBark.players[0].hand.length).toBeGreaterThanOrEqual(beforeBarkActorHand);
    afterBark.currentPlayerIndex = 0;

    const towerPending = playCard({ state: afterBark, playerId: "p1", cardInstanceId: "tower-of-power#t1", now: 29000 });
    const afterTower = resolvePendingAction(towerPending, 35000);
    expect(afterTower.players[0].hand.some((card) => card.startsWith("nope#tower-"))).toBe(true);
    afterTower.currentPlayerIndex = 0;

    const takePending = playCard({ state: afterTower, playerId: "p1", cardInstanceId: "ill-take-that#i1", targetPlayerId: "p2", now: 36000 });
    const afterTake = resolvePendingAction(takePending, 42000);
    expect(afterTake.players[0].hand).toContain("skip#future");
  });

});
