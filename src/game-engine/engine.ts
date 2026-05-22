import { createDeckCardIds, getCardData } from "@/data/cardsData";
import type {
  ClientGameState,
  GameAction,
  InitializeGameInput,
  PlayCardInput,
  PlayerId,
  PlayerState,
  ServerGameState,
} from "./types";

const TURN_DURATION_MS = 30000;

function cloneState(state: ServerGameState): ServerGameState {
  return structuredClone(state);
}

function multisetEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const item of a) counts.set(item, (counts.get(item) ?? 0) + 1);
  for (const item of b) {
    const next = (counts.get(item) ?? 0) - 1;
    if (next < 0) return false;
    counts.set(item, next);
  }
  return [...counts.values()].every((value) => value === 0);
}

function nowWithTurn(state: ServerGameState, now = Date.now()) {
  state.turnStartedAt = now;
  state.turnExpiresAt = now + TURN_DURATION_MS;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function makeInstance(cardId: string, index: number) {
  return `${cardId}#${index}`;
}

export function getCardBaseId(cardInstanceId: string) {
  return cardInstanceId.split("#")[0] ?? cardInstanceId;
}

function getPlayer(state: ServerGameState, playerId: PlayerId) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Player not found: ${playerId}`);
  if (!player.alive) throw new Error(`Player is eliminated: ${playerId}`);
  return player;
}

function currentPlayer(state: ServerGameState) {
  return state.players[state.currentPlayerIndex];
}

function alivePlayers(state: ServerGameState) {
  return state.players.filter((player) => player.alive);
}

function advanceTurn(state: ServerGameState, now = Date.now()) {
  const living = alivePlayers(state);
  if (living.length <= 1) {
    state.status = "FINISHED";
    state.winnerId = living[0]?.id;
    return;
  }

  let index = state.currentPlayerIndex;
  do {
    index = (index + state.direction + state.players.length) % state.players.length;
  } while (!state.players[index].alive);

  state.currentPlayerIndex = index;
  state.pendingTurns = Math.max(1, state.pendingTurns || 1);
  nowWithTurn(state, now);
}

function finishOneTurn(state: ServerGameState, now = Date.now()) {
  state.pendingTurns -= 1;
  if (state.pendingTurns <= 0) {
    state.pendingTurns = 1;
    advanceTurn(state, now);
  } else {
    nowWithTurn(state, now);
  }
}

function nextAlivePlayerId(state: ServerGameState, fromPlayerId: PlayerId): PlayerId {
  const fromIdx = state.players.findIndex((p) => p.id === fromPlayerId);
  if (fromIdx < 0) throw new Error("Player not in game");
  let index = fromIdx;
  for (let step = 0; step < state.players.length; step += 1) {
    index = (index + state.direction + state.players.length) % state.players.length;
    const candidate = state.players[index];
    if (candidate?.alive) return candidate.id;
  }
  throw new Error("No next alive player");
}

function hasBlockingInteraction(state: ServerGameState): boolean {
  return Boolean(
    state.pendingDrawAlter ||
      state.pendingBury ||
      state.pendingShareFuture ||
      state.pendingShuffle ||
      state.pendingDefuseExplosion ||
      state.pendingCatSteal,
  );
}

function assertNoBlockingInteraction(state: ServerGameState) {
  if (hasBlockingInteraction(state)) throw new Error("Finish the current card step before doing that");
}

function assertPlaying(state: ServerGameState) {
  if (state.status !== "PLAYING") throw new Error("Game has not started");
}

export function initializeGame({
  id,
  players,
  expansions = ["BASE"],
  targetDeckSize,
  random = Math.random,
}: InitializeGameInput): ServerGameState {
  if (players.length < 2) throw new Error("Need at least 2 players");
  if (players.length > 8) throw new Error("This implementation supports up to 8 players");

  const explosionCount = players.length - 1;
  const minimumDeckSize = players.length * 5 + explosionCount + 1;
  const finalDeckSize = Math.min(120, Math.max(minimumDeckSize, Math.floor(targetDeckSize ?? 19 + players.length * 5)));
  const normalCardCount = finalDeckSize - players.length - explosionCount - 1;
  const baseDeck = createDeckCardIds(expansions);
  const exploding = Array.from({ length: explosionCount }, () => "exploding-kitten");
  const normalCards = shuffle(
    baseDeck.filter((cardId) => cardId !== "exploding-kitten" && cardId !== "defuse"),
    random,
  ).slice(0, normalCardCount);

  let counter = 0;
  const pile = shuffle(normalCards.map((cardId) => makeInstance(cardId, counter++)), random);
  /** Gỡ Bom trên tay: đúng 1 lá mỗi người (= số người lá gắn với người chơi). */
  const playerStates: PlayerState[] = players.map((player) => ({
    id: player.id,
    name: player.name,
    hand: [makeInstance("defuse", counter++)],
    alive: true,
    connected: true,
  }));

  for (const player of playerStates) {
    for (let drawn = 0; drawn < 4; drawn += 1) {
      const card = pile.pop();
      if (!card) throw new Error("Not enough cards to deal");
      player.hand.push(card);
    }
  }

  const explosions = exploding.map((cardId) => makeInstance(cardId, counter++));
  const extraDefuseInPile = makeInstance("defuse", counter++);
  const drawPile = shuffle([...pile, extraDefuseInPile, ...explosions], random);
  const startedAt = Date.now();

  return {
    id,
    status: "LOBBY",
    players: playerStates,
    drawPile,
    discardPile: [],
    currentPlayerIndex: 0,
    direction: 1,
    pendingTurns: 1,
    turnStartedAt: startedAt,
    turnExpiresAt: 0,
    insights: [],
    targetDeckSize: finalDeckSize,
    expansions: [...expansions],
    log: [
      `Room created for up to ${players.length} players.`,
      `Deck size: ${players.length * 5 + drawPile.length} cards (${players.length * 5 + drawPile.length} lá). Defuse: ${players.length} starting cards + 1 in the draw pile. Exploding Kittens in pile: ${explosionCount}.`,
    ],
    updatedAt: startedAt,
  };
}

export function startGame(state: ServerGameState, playerId: PlayerId, now = Date.now()): ServerGameState {
  const next = cloneState(state);
  if (next.status === "PLAYING") return next;
  if (next.status !== "LOBBY") throw new Error("Game cannot be started");
  if (!next.players.some((player) => player.id === playerId && player.connected)) {
    throw new Error("Only a connected player can start the game");
  }
  const connectedPlayers = next.players.filter((player) => player.connected);
  if (connectedPlayers.length < 2) throw new Error("Cần ít nhất 2 người chơi để bắt đầu.");
  const firstConnectedIndex = next.players.findIndex((player) => player.connected && player.alive);
  next.currentPlayerIndex = firstConnectedIndex >= 0 ? firstConnectedIndex : 0;
  next.status = "PLAYING";
  nowWithTurn(next, now);
  next.log.push(`Ván chơi bắt đầu với ${connectedPlayers.length} người chơi.`);
  next.updatedAt = now;
  return next;
}

export function joinGame(state: ServerGameState, playerId: PlayerId, name: string): ServerGameState {
  const next = cloneState(state);
  let player = next.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    if (next.status !== "LOBBY") throw new Error("Ván đã bắt đầu, không thể vào thêm.");
    player = next.players.find((candidate) => !candidate.connected);
    if (!player) throw new Error("Phòng đã đủ người chơi.");
    player.id = playerId;
  }
  const wasConnected = player.connected;
  player.name = name || player.name;
  player.connected = true;
  if (!wasConnected) {
    next.log.push(`${player.name} đã vào phòng.`);
  }
  next.updatedAt = Date.now();
  return next;
}

function eliminateExplodingPlayer(state: ServerGameState, player: PlayerState, card: string, now = Date.now()) {
  state.discardPile.push(card);
  player.alive = false;
  state.lastExplosion = {
    playerId: player.id,
    playerName: player.name,
    cardId: getCardBaseId(card),
    eliminated: true,
    at: now,
  };
  addTableMessage(state, "BOOM!", `${player.name} rút Mèo Nổ, không còn Gỡ Bom/Zombie Kitten và đã bị loại khỏi ván.`);
  state.log.push(`${player.name} đã nổ và bị loại.`);
}

function resolveExplodingKittenDraw(
  state: ServerGameState,
  player: PlayerState,
  card: string,
  now = Date.now(),
): "streaking" | "pending_defuse" | "eliminated" {
  const streaking = player.hand.some((handCard) => getCardBaseId(handCard) === "streaking-kitten");
  if (streaking) {
    player.hand.push(card);
    state.log.push(`${player.name} giữ Mèo Nổ nhờ Mèo Ăn Gian.`);
    return "streaking";
  }

  const defuseIndex = player.hand.findIndex(
    (handCard) => getCardBaseId(handCard) === "defuse" || getCardBaseId(handCard) === "zombie-kitten",
  );
  if (defuseIndex >= 0) {
    state.pendingDefuseExplosion = { playerId: player.id, explodingCardInstanceId: card };
    state.lastExplosion = {
      playerId: player.id,
      playerName: player.name,
      cardId: getCardBaseId(card),
      eliminated: false,
      at: now,
    };
    state.log.push(`${player.name} rút Mèo Nổ! Dùng Gỡ Bom và chọn vị trí để chôn lại lá Mèo Nổ.`);
    return "pending_defuse";
  }

  eliminateExplodingPlayer(state, player, card, now);
  return "eliminated";
}

export function drawCard(state: ServerGameState, playerId: PlayerId, fromBottom = false, now = Date.now()): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot draw while an action is waiting for Nope");
  if (next.pendingDrawAlter) throw new Error("Confirm Alter the Future order before drawing");
  if (next.pendingBury) throw new Error("Finish burying the card before drawing");
  if (next.pendingShareFuture) throw new Error("Finish Share the Future before drawing");
  if (next.pendingShuffle) throw new Error("Confirm the shuffle before drawing");
  if (next.pendingDefuseExplosion) throw new Error("Resolve Exploding Kitten with Defuse before drawing");
  if (next.pendingCatSteal) throw new Error("Chọn lá từ tay đối thủ trước khi rút bài");
  const player = getPlayer(next, playerId);
  if (currentPlayer(next)?.id !== playerId) throw new Error("Not this player's turn");
  const card = fromBottom ? next.drawPile.shift() : next.drawPile.pop();
  if (!card) throw new Error("Draw pile is empty");

  const baseId = getCardBaseId(card);
  if (baseId === "exploding-kitten") {
    const outcome = resolveExplodingKittenDraw(next, player, card, now);
    if (outcome === "pending_defuse") {
      next.updatedAt = now;
      return next;
    }
  } else if (baseId === "zombie-kitten") {
    player.hand.push(card);
    next.log.push(`${player.name} rút một lá Zombie Kitten.`);
  } else if (baseId === "imploding-kitten") {
    next.discardPile.push(card);
    player.alive = false;
    next.log.push(`${player.name} rút Mèo Sập và bị loại.`);
  } else {
    player.hand.push(card);
    next.log.push(`${player.name} rút một lá bài.`);
  }

  finishOneTurn(next, now);
  next.updatedAt = now;
  return next;
}

function actionForCard(cardId: string, targetPlayerId?: PlayerId): GameAction {
  switch (cardId) {
    case "attack":
      return { type: "ATTACK", turns: 2 };
    case "targeted-attack-2x":
      if (!targetPlayerId) throw new Error("Targeted Attack requires targetPlayerId");
      return { type: "TARGETED_ATTACK", targetPlayerId, turns: 2 };
    case "personal-attack-3x":
      return { type: "PERSONAL_ATTACK", turns: 3 };
    case "skip":
      return { type: "SKIP" };
    case "super-skip":
      return { type: "SKIP", allTurns: true };
    case "reverse":
      return { type: "REVERSE" };
    case "shuffle":
      return { type: "SHUFFLE" };
    case "see-the-future-3x":
      return { type: "SEE", count: 3 };
    case "see-the-future-5x":
      return { type: "SEE", count: 5 };
    case "alter-the-future-3x":
    case "alter-the-future-now":
      return { type: "ALTER", count: 3 };
    case "alter-the-future-5x":
      return { type: "ALTER", count: 5 };
    case "bury":
      return { type: "BURY" };
    case "share-the-future":
      return { type: "SHARE_FUTURE", count: 3 };
    case "draw-from-bottom":
      return { type: "DRAW_FROM_BOTTOM" };
    case "swap-top-bottom":
      return { type: "SWAP_TOP_BOTTOM" };
    case "catomic-bomb":
      return { type: "CATOMIC_BOMB" };
    case "favor":
      if (!targetPlayerId) throw new Error("Favor requires targetPlayerId");
      return { type: "FAVOR", targetPlayerId };
    case "mark":
      if (!targetPlayerId) throw new Error("Mark requires targetPlayerId");
      return { type: "MARK", targetPlayerId };
    case "curse-of-cat-butt":
      if (!targetPlayerId) throw new Error("Curse of Cat Butt requires targetPlayerId");
      return { type: "CURSE_OF_CAT_BUTT", targetPlayerId };
    case "barking-kitten":
      return { type: "BARKING_KITTEN", targetPlayerId };
    case "tower-of-power":
      return { type: "TOWER_OF_POWER" };
    case "ill-take-that":
      return { type: "ILL_TAKE_THAT", targetPlayerId };
    case "attack-of-the-dead":
      return { type: "ATTACK_OF_THE_DEAD" };
    case "clairvoyance":
      if (!targetPlayerId) throw new Error("Clairvoyance requires targetPlayerId");
      return { type: "CLAIRVOYANCE", targetPlayerId };
    case "clone":
      return { type: "CLONE" };
    case "dig-deeper":
      return { type: "DIG_DEEPER" };
    case "feed-the-dead":
      return { type: "FEED_THE_DEAD", targetPlayerId };
    case "grave-robber":
      return { type: "GRAVE_ROBBER", targetPlayerId };
    case "shuffle-now":
      return { type: "SHUFFLE_NOW" };
    case "armageddon":
      if (!targetPlayerId) throw new Error("Armageddon requires targetPlayerId");
      return { type: "ARMAGEDDON", targetPlayerId };
    case "godcat":
      return { type: "GODCAT" };
    case "devilcat":
      return { type: "DEVILCAT", targetPlayerId };
    case "raising-heck":
      return { type: "RAISING_HECK" };
    case "potluck":
      return { type: "POTLUCK" };
    case "reveal-the-future-3x":
      return { type: "REVEAL", count: 3 };
    default:
      return { type: "PROMPT", prompt: `Card ${cardId} requires a follow-up choice.` };
  }
}

function addInsight(
  state: ServerGameState,
  playerId: PlayerId,
  title: string,
  cards: string[],
  message?: string,
  reorderDrawTop?: string[],
) {
  state.insights = state.insights.filter((insight) => insight.playerId !== playerId);
  state.insights.push({
    playerId,
    title,
    cards,
    reorderDrawTop,
    message,
    expiresAt: Date.now() + (reorderDrawTop ? 120000 : 15000),
  });
}

function addTableMessage(state: ServerGameState, title: string, message: string) {
  for (const player of state.players.filter((candidate) => candidate.connected)) {
    addInsight(state, player.id, title, [], message);
  }
}

function aliveOpponents(state: ServerGameState, playerId: PlayerId) {
  return state.players.filter((player) => player.alive && player.id !== playerId);
}

function eliminatedPlayersWithCards(state: ServerGameState) {
  return state.players.filter((player) => !player.alive && player.hand.length > 0);
}

function lastCloneableCardId(state: ServerGameState) {
  for (let index = state.discardPile.length - 2; index >= 0; index -= 1) {
    const baseId = getCardBaseId(state.discardPile[index]);
    if (baseId !== "clone" && baseId !== "nope" && baseId !== "defuse" && baseId !== "exploding-kitten") {
      return baseId;
    }
  }
  return undefined;
}

function isNormalCatCard(cardInstanceId: string) {
  const card = getCardData(getCardBaseId(cardInstanceId));
  return card?.type === "CAT" || card?.type === "FERAL_CAT";
}

/** Two matching cat cards, or Feral Cat substituting for a cat (official rules). */
function catsFormValidPair(a: string, b: string): boolean {
  const baseA = getCardBaseId(a);
  const baseB = getCardBaseId(b);
  if (baseA === baseB) return true;
  const dataA = getCardData(baseA);
  const dataB = getCardData(baseB);
  const isFeral = (card: ReturnType<typeof getCardData>) => card?.type === "FERAL_CAT";
  const isPlainCat = (card: ReturnType<typeof getCardData>) => card?.type === "CAT";
  if (isFeral(dataA) && isPlainCat(dataB)) return true;
  if (isFeral(dataB) && isPlainCat(dataA)) return true;
  if (isFeral(dataA) && isFeral(dataB)) return true;
  return false;
}

export function completeDrawAlter({
  state,
  playerId,
  orderedInstanceIds,
  now = Date.now(),
}: {
  state: ServerGameState;
  playerId: PlayerId;
  orderedInstanceIds: string[];
  now?: number;
}): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot reorder while an action is waiting for Nope");
  const step = next.pendingDrawAlter;
  if (!step) throw new Error("No draw reorder is pending");
  if (step.playerId !== playerId) throw new Error("Only the player who altered the future can confirm the order");
  if (orderedInstanceIds.length !== step.count) throw new Error("Wrong number of cards in reorder");

  const currentTop = next.drawPile.slice(-step.count);
  if (!multisetEqual(currentTop, orderedInstanceIds)) {
    throw new Error("Those cards do not match the current top of the draw pile");
  }

  const newTailBottomToTop = [...orderedInstanceIds].reverse();
  next.drawPile.splice(-step.count, step.count, ...newTailBottomToTop);
  next.pendingDrawAlter = undefined;
  next.insights = next.insights.filter((insight) => !(insight.playerId === playerId && insight.reorderDrawTop));

  const actor = getPlayer(next, playerId);
  next.log.push(`${actor.name} đã sắp xếp lại ${step.count} lá trên cùng xấp rút.`);
  nowWithTurn(next, now);
  next.updatedAt = now;
  return next;
}

export function completeBury({
  state,
  playerId,
  insertIndex,
  now = Date.now(),
}: {
  state: ServerGameState;
  playerId: PlayerId;
  insertIndex: number;
  now?: number;
}): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot bury while an action is waiting for Nope");
  const bury = next.pendingBury;
  if (!bury) throw new Error("No bury step is active");
  if (bury.playerId !== playerId) throw new Error("Only the burying player can confirm");
  if (!Number.isInteger(insertIndex) || insertIndex < 0 || insertIndex > next.drawPile.length) {
    throw new Error("Insert index must be an integer from 0 to the current draw pile size");
  }

  next.drawPile.splice(insertIndex, 0, bury.cardInstanceId);
  next.pendingBury = undefined;
  next.insights = next.insights.filter((insight) => !(insight.playerId === playerId && insight.title.includes("Chôn bài")));

  const actor = getPlayer(next, playerId);
  next.log.push(`${actor.name} đã chôn lá trở lại xấp rút (vị trí ${insertIndex}).`);
  nowWithTurn(next, now);
  next.updatedAt = now;
  return next;
}

export function completeShuffle({
  state,
  playerId,
  random = Math.random,
  now = Date.now(),
}: {
  state: ServerGameState;
  playerId: PlayerId;
  random?: () => number;
  now?: number;
}): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot shuffle while an action is waiting for Nope");
  const pending = next.pendingShuffle;
  if (!pending) throw new Error("No shuffle step is active");
  if (pending.playerId !== playerId) throw new Error("Only the player who played Shuffle can confirm");

  next.drawPile = shuffle(next.drawPile, random);
  next.pendingShuffle = undefined;
  next.insights = next.insights.filter((insight) => !(insight.playerId === playerId && insight.title === "Xào bài"));

  const actor = getPlayer(next, playerId);
  addTableMessage(next, "Xấp rút đã được xào", `${actor.name} đã trộn toàn bộ xấp rút.`);
  next.log.push(`${actor.name} xào xấp rút.`);
  nowWithTurn(next, now);
  next.updatedAt = now;
  return next;
}

export function completeShareFuturePhase({
  state,
  playerId,
  orderedInstanceIds,
  now = Date.now(),
}: {
  state: ServerGameState;
  playerId: PlayerId;
  orderedInstanceIds: string[];
  now?: number;
}): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot resolve Share the Future while waiting for Nope");
  const pending = next.pendingShareFuture;
  if (!pending) throw new Error("No Share the Future step is active");

  const activeId = pending.phase === "actor" ? pending.actorId : pending.nextPlayerId;
  if (activeId !== playerId) throw new Error("Not your turn to confirm Share the Future");
  if (orderedInstanceIds.length !== pending.orderedInstanceIds.length) {
    throw new Error("Wrong number of cards");
  }
  if (!multisetEqual(orderedInstanceIds, pending.orderedInstanceIds)) {
    throw new Error("Those cards do not match the Share the Future set");
  }

  if (pending.phase === "actor") {
    pending.phase = "next";
    pending.orderedInstanceIds = [...orderedInstanceIds];
    next.insights = next.insights.filter((i) => !(i.playerId === pending.actorId && i.reorderDrawTop));
    const nextPlayer = getPlayer(next, pending.nextPlayerId);
    addInsight(
      next,
      pending.nextPlayerId,
      `Chia sẻ ${orderedInstanceIds.length} lá (người kế)`,
      orderedInstanceIds.map(getCardBaseId),
      `${getPlayer(next, pending.actorId).name} đã sắp xếp. Bạn có thể sắp lại trước khi trả các lá lên xấp rút.`,
      [...orderedInstanceIds],
    );
    next.log.push(`${nextPlayer.name} xem các lá từ Chia Sẻ Tương Lai.`);
  } else {
    const tailBottomToTop = [...orderedInstanceIds].reverse();
    next.drawPile.push(...tailBottomToTop);
    next.pendingShareFuture = undefined;
    next.insights = next.insights.filter(
      (i) =>
        !(
          i.reorderDrawTop &&
          (i.playerId === pending.actorId || i.playerId === pending.nextPlayerId) &&
          i.title.includes("Chia sẻ")
        ),
    );
    next.log.push("Chia Sẻ Tương Lai: các lá đã được trả lại lên đỉnh xấp rút.");
  }

  next.updatedAt = now;
  return next;
}

export function completeDefuseExplosion({
  state,
  playerId,
  insertIndex,
  now = Date.now(),
}: {
  state: ServerGameState;
  playerId: PlayerId;
  insertIndex: number;
  now?: number;
}): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot place defuse while an action is waiting for Nope");
  const pending = next.pendingDefuseExplosion;
  if (!pending) throw new Error("No Exploding Kitten defuse step is active");
  if (pending.playerId !== playerId) throw new Error("Only the drawing player can confirm defuse placement");
  if (!Number.isInteger(insertIndex) || insertIndex < 0 || insertIndex > next.drawPile.length) {
    throw new Error("Insert index must be an integer from 0 to the current draw pile size");
  }

  const player = getPlayer(next, playerId);
  const defuseIndex = player.hand.findIndex(
    (handCard) => getCardBaseId(handCard) === "defuse" || getCardBaseId(handCard) === "zombie-kitten",
  );
  if (defuseIndex < 0) throw new Error("No Defuse or Zombie Kitten card in hand");

  const [defuse] = player.hand.splice(defuseIndex, 1);
  next.discardPile.push(defuse);
  const revived = getCardBaseId(defuse) === "zombie-kitten"
    ? next.players.find((candidate) => !candidate.alive)
    : undefined;
  if (revived) {
    revived.alive = true;
    revived.connected = true;
    if (player.hand.length > 0) {
      revived.hand.push(player.hand.shift()!);
    } else {
      const gift = next.drawPile.findIndex((card) => getCardBaseId(card) !== "exploding-kitten");
      if (gift >= 0) revived.hand.push(next.drawPile.splice(gift, 1)[0]);
    }
    const liveBombs = next.drawPile.filter((card) => getCardBaseId(card) === "exploding-kitten").length + 1;
    const aliveAfterRevive = next.players.filter((candidate) => candidate.alive).length;
    const neededBombs = Math.max(0, aliveAfterRevive - 1);
    for (let i = liveBombs; i < neededBombs; i += 1) {
      next.drawPile.unshift(makeInstance("exploding-kitten", now + i));
    }
    next.log.push(`${player.name} dùng Zombie Kitten và hồi sinh ${revived.name}.`);
  }
  next.drawPile.splice(insertIndex, 0, pending.explodingCardInstanceId);
  next.pendingDefuseExplosion = undefined;
  next.lastExplosion = {
    playerId: player.id,
    playerName: player.name,
    cardId: getCardBaseId(pending.explodingCardInstanceId),
    eliminated: false,
    at: now,
  };
  addTableMessage(
    next,
    getCardBaseId(defuse) === "zombie-kitten" ? "Zombie Kitten" : "Gỡ Bom thành công",
    revived
      ? `${player.name} chôn Mèo Nổ trở lại xấp rút và hồi sinh ${revived.name}. Số Mèo Nổ trong xấp được cân bằng theo số người còn sống.`
      : `${player.name} chôn Mèo Nổ trở lại xấp rút và tiếp tục ván.`,
  );

  next.log.push(`${player.name} dùng Gỡ Bom và chôn Mèo Nổ vào xấp rút.`);
  finishOneTurn(next, now);
  next.updatedAt = now;
  return next;
}

export function markPlayerDisconnected(
  state: ServerGameState,
  playerId: PlayerId,
  ownerPlayerId: PlayerId | undefined,
  now = Date.now(),
): { state: ServerGameState; shouldDeleteRoom: boolean; nextOwnerPlayerId?: PlayerId } {
  const next = cloneState(state);
  const player = next.players.find((p) => p.id === playerId);
  if (player) {
    if (player.connected) {
      next.log.push(`${player.name} left the room.`);
    }
    player.connected = false;
  }

  const connectedPlayers = next.players.filter((candidate) => candidate.connected);
  const nextOwnerPlayerId = ownerPlayerId === playerId ? connectedPlayers[0]?.id : ownerPlayerId;
  if (nextOwnerPlayerId && nextOwnerPlayerId !== ownerPlayerId) {
    const nextOwner = next.players.find((candidate) => candidate.id === nextOwnerPlayerId);
    next.log.push(`${nextOwner?.name ?? "A player"} is now the host.`);
  }
  next.ownerPlayerId = nextOwnerPlayerId;
  next.updatedAt = now;
  return { state: next, shouldDeleteRoom: connectedPlayers.length === 0, nextOwnerPlayerId };
}

export function playCatCombo({
  state,
  playerId,
  cardInstanceIds,
  targetPlayerId,
  now = Date.now(),
}: {
  state: ServerGameState;
  playerId: PlayerId;
  cardInstanceIds: [string, string];
  targetPlayerId: PlayerId;
  now?: number;
}): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot play a combo while waiting for Nope");
  if (next.pendingDefuseExplosion) throw new Error("Resolve Exploding Kitten before playing a combo");
  assertNoBlockingInteraction(next);
  const actor = getPlayer(next, playerId);
  if (currentPlayer(next)?.id !== playerId) throw new Error("Not this player's turn");
  if (cardInstanceIds.length !== 2) throw new Error("Cat combo requires exactly 2 cards");

  if (cardInstanceIds[0] === cardInstanceIds[1]) throw new Error("Cat combo requires two distinct cards from hand");
  if (!cardInstanceIds.every(isNormalCatCard)) throw new Error("Only normal cat cards can be used for this combo");
  if (!catsFormValidPair(cardInstanceIds[0], cardInstanceIds[1])) {
    throw new Error("Cat combo requires two matching cat cards (or Feral Cat with any cat)");
  }

  const target = getPlayer(next, targetPlayerId);
  if (target.id === actor.id) throw new Error("Target must be another player");
  if (target.hand.length === 0) throw new Error("Target has no cards to steal");

  for (const cardInstanceId of cardInstanceIds) {
    const handIndex = actor.hand.indexOf(cardInstanceId);
    if (handIndex < 0) throw new Error("Combo card is not in player's hand");
    const [played] = actor.hand.splice(handIndex, 1);
    next.discardPile.push(played);
  }

  next.pendingCatSteal = { playerId: actor.id, targetPlayerId: target.id };
  next.log.push(`${actor.name} dùng combo 2 mèo — chọn 1 lá từ tay ${target.name}.`);
  nowWithTurn(next, now);
  next.updatedAt = now;
  return next;
}

export function completeCatSteal({
  state,
  playerId,
  stolenCardInstanceId,
  now = Date.now(),
}: {
  state: ServerGameState;
  playerId: PlayerId;
  stolenCardInstanceId: string;
  now?: number;
}): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot steal while an action is waiting for Nope");
  const pending = next.pendingCatSteal;
  if (!pending) throw new Error("No cat steal step is active");
  if (pending.playerId !== playerId) throw new Error("Only the player who played the cat combo can pick a card");

  const actor = getPlayer(next, playerId);
  const target = getPlayer(next, pending.targetPlayerId);
  const idx = target.hand.indexOf(stolenCardInstanceId);
  if (idx < 0) throw new Error("That card is not in the target's hand");

  const [stolenCard] = target.hand.splice(idx, 1);
  actor.hand.push(stolenCard);
  next.pendingCatSteal = undefined;

  const stolenCardData = getCardData(getCardBaseId(stolenCard));
  addInsight(
    next,
    actor.id,
    `Bóc bài từ ${target.name}`,
    [getCardBaseId(stolenCard)],
    `Bạn đã lấy ${stolenCardData?.title ?? "một lá bài"}.`,
  );
  addInsight(next, target.id, "Bị bóc bài", [], `${actor.name} đã dùng combo 2 mèo để lấy 1 lá từ tay bạn.`);
  next.log.push(`${actor.name} đã lấy một lá từ ${target.name}.`);
  nowWithTurn(next, now);
  next.updatedAt = now;
  return next;
}

export function shuffleVictimHand({
  state,
  playerId,
  random = Math.random,
  now = Date.now(),
}: {
  state: ServerGameState;
  playerId: PlayerId;
  random?: () => number;
  now?: number;
}): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  const pending = next.pendingCatSteal;
  if (!pending) throw new Error("No cat steal step is active");
  if (pending.targetPlayerId !== playerId) {
    throw new Error("Only the target of the steal can shuffle their own hand");
  }
  const target = getPlayer(next, playerId);
  if (target.hand.length <= 1) return state;
  target.hand = shuffle(target.hand, random);
  next.log.push(`${target.name} đã xáo lại bài trên tay.`);
  next.updatedAt = now;
  return next;
}

function applyAction(state: ServerGameState, playerId: PlayerId, action: GameAction, now = Date.now()) {
  assertPlaying(state);
  const actor = getPlayer(state, playerId);
  switch (action.type) {
    case "ATTACK":
      finishOneTurn(state, now);
      state.pendingTurns += action.turns - 1;
      state.log.push(`${actor.name} tấn công người chơi kế tiếp ${action.turns} lượt.`);
      break;
    case "TARGETED_ATTACK": {
      const index = state.players.findIndex((player) => player.id === action.targetPlayerId && player.alive);
      if (index < 0) throw new Error("Target player not found");
      state.currentPlayerIndex = index;
      state.pendingTurns = action.turns;
      nowWithTurn(state, now);
      state.log.push(`${actor.name} chỉ định ${state.players[index].name} chơi ${action.turns} lượt.`);
      break;
    }
    case "PERSONAL_ATTACK":
      state.pendingTurns = action.turns;
      state.currentPlayerIndex = state.players.findIndex((player) => player.id === playerId);
      nowWithTurn(state, now);
      state.log.push(`${actor.name} tự tấn công và phải chơi ${action.turns} lượt.`);
      break;
    case "SKIP":
      if (action.allTurns) state.pendingTurns = 1;
      finishOneTurn(state, now);
      state.log.push(`${actor.name} bỏ lượt.`);
      break;
    case "REVERSE":
      state.direction = state.direction === 1 ? -1 : 1;
      finishOneTurn(state, now);
      state.log.push(`${actor.name} đảo chiều lượt chơi.`);
      break;
    case "SHUFFLE":
      state.pendingShuffle = { playerId };
      addInsight(
        state,
        playerId,
        "Xào bài",
        [],
        "Bấm nút đỏ bên dưới để trộn ngẫu nhiên toàn bộ xấp rút (chỉ bạn thấy bước này).",
      );
      state.log.push(`${actor.name} chuẩn bị xào xấp rút.`);
      break;
    case "DRAW_FROM_BOTTOM": {
      const drawn = drawCard(state, playerId, true, now);
      Object.assign(state, drawn);
      state.log.push(`${actor.name} rút từ đáy xấp.`);
      break;
    }
    case "SWAP_TOP_BOTTOM":
      if (state.drawPile.length > 1) {
        [state.drawPile[0], state.drawPile[state.drawPile.length - 1]] = [
          state.drawPile[state.drawPile.length - 1],
          state.drawPile[0],
        ];
      }
      addTableMessage(state, "Đổi đầu và đáy", `${actor.name} đã đổi lá trên cùng và dưới cùng của xấp rút.`);
      state.log.push(`${actor.name} đổi đầu và đáy xấp rút.`);
      break;
    case "CATOMIC_BOMB": {
      const bombs = state.drawPile.filter((card) => getCardBaseId(card) === "exploding-kitten");
      const rest = state.drawPile.filter((card) => getCardBaseId(card) !== "exploding-kitten");
      state.drawPile = [...rest, ...bombs];
      addTableMessage(state, "Bom Mèo Nguyên Tử", `${actor.name} đã đặt toàn bộ Mèo Nổ lên đầu xấp rút.`);
      finishOneTurn(state, now);
      state.log.push(`${actor.name} kích hoạt Bom Mèo Nguyên Tử.`);
      break;
    }
    case "SEE":
      addInsight(
        state,
        playerId,
        `Xem ${action.count} lá trên cùng`,
        state.drawPile.slice(-action.count).map(getCardBaseId).reverse(),
        "Chỉ bạn thấy các lá này.",
      );
      state.log.push(`${actor.name} xem trước ${action.count} lá.`);
      break;
    case "ALTER": {
      const count = Math.min(action.count, state.drawPile.length);
      const inDrawOrder = state.drawPile.slice(-count).reverse();
      addInsight(
        state,
        playerId,
        `Biến đổi ${count} lá trên cùng`,
        inDrawOrder.map(getCardBaseId),
        "Kéo thả để đổi thứ tự (trái = rút trước), rồi bấm Xác nhận để áp dụng.",
        inDrawOrder,
      );
      state.pendingDrawAlter = { playerId, count };
      state.log.push(`${actor.name} xem để biến đổi ${count} lá trên cùng.`);
      break;
    }
    case "BURY": {
      if (state.drawPile.length === 0) break;
      const cardInstanceId = state.drawPile.pop()!;
      state.pendingBury = { playerId: actor.id, cardInstanceId };
      addInsight(
        state,
        playerId,
        "Chôn bài — xem lá trên cùng",
        [getCardBaseId(cardInstanceId)],
        `Nhập vị trí chèn từ 0 (đáy xấp) đến ${state.drawPile.length} (trên cùng), rồi xác nhận.`,
      );
      state.log.push(`${actor.name} xem lá trên cùng để chôn lại vào xấp rút.`);
      break;
    }
    case "SHARE_FUTURE": {
      const count = Math.min(action.count, state.drawPile.length);
      if (count === 0) break;
      const taken = state.drawPile.splice(state.drawPile.length - count, count);
      const inDrawOrder = [...taken].reverse();
      const nextPid = nextAlivePlayerId(state, playerId);
      state.pendingShareFuture = {
        actorId: playerId,
        nextPlayerId: nextPid,
        phase: "actor",
        orderedInstanceIds: inDrawOrder,
      };
      addInsight(
        state,
        playerId,
        `Chia sẻ ${count} lá (bạn)`,
        inDrawOrder.map(getCardBaseId),
        "Sắp xếp thứ tự, xác nhận. Sau đó người kế tiếp cũng được xem và sắp lại trước khi trả lá lên xấp.",
        inDrawOrder,
      );
      state.log.push(`${actor.name} dùng Chia Sẻ Tương Lai (${count} lá).`);
      break;
    }
    case "FAVOR": {
      const target = getPlayer(state, action.targetPlayerId);
      if (target.hand.length === 0) {
        addInsight(state, playerId, "Favor", [], `${target.name} không có lá nào để đưa.`);
        break;
      }
      const given = target.hand.shift()!;
      actor.hand.push(given);
      addInsight(state, playerId, "Favor", [getCardBaseId(given)], `${target.name} đưa cho bạn một lá.`);
      addInsight(state, target.id, "Favor", [], `Bạn đưa một lá cho ${actor.name}.`);
      state.log.push(`${actor.name} nhận một lá từ ${target.name}.`);
      nowWithTurn(state, now);
      break;
    }
    case "MARK": {
      const target = getPlayer(state, action.targetPlayerId);
      const marked = target.hand[0];
      if (!marked) {
        addInsight(state, playerId, "Mark", [], `${target.name} không có bài trên tay.`);
        break;
      }
      addTableMessage(state, "Marked Card", `${actor.name} đánh dấu một lá trên tay ${target.name}.`);
      addInsight(state, playerId, `Marked: ${target.name}`, [getCardBaseId(marked)], "Lá này đang bị lộ.");
      addInsight(state, target.id, "Marked", [getCardBaseId(marked)], "Một lá trên tay bạn đang bị lộ.");
      state.log.push(`${actor.name} đánh dấu một lá của ${target.name}.`);
      nowWithTurn(state, now);
      break;
    }
    case "CURSE_OF_CAT_BUTT": {
      const target = getPlayer(state, action.targetPlayerId);
      addInsight(state, target.id, "Curse of Cat Butt", [], "Bạn bị nguyền: hãy chơi cẩn thận cho đến lượt rút tiếp theo.");
      state.log.push(`${actor.name} nguyền ${target.name}.`);
      nowWithTurn(state, now);
      break;
    }
    case "BARKING_KITTEN": {
      const target = action.targetPlayerId ? getPlayer(state, action.targetPlayerId) : aliveOpponents(state, playerId)[0];
      if (!target) break;
      const taken = target.hand.shift();
      if (taken) actor.hand.push(taken);
      addInsight(state, playerId, "Barking Kitten", taken ? [getCardBaseId(taken)] : [], `Bạn kéo ${target.name} vào cuộc đối đầu.`);
      state.log.push(`${actor.name} dùng Barking Kitten với ${target.name}.`);
      nowWithTurn(state, now);
      break;
    }
    case "TOWER_OF_POWER":
      actor.hand.push(`nope#tower-${now}`);
      addInsight(state, playerId, "Tower of Power", ["nope"], "Tháp Quyền Lực cấp cho bạn một Nope phòng thủ tạm thời.");
      state.log.push(`${actor.name} dựng Tháp Quyền Lực.`);
      nowWithTurn(state, now);
      break;
    case "ILL_TAKE_THAT": {
      const target = action.targetPlayerId ? getPlayer(state, action.targetPlayerId) : aliveOpponents(state, playerId)[0];
      if (!target) break;
      const card = state.drawPile.pop();
      if (card) actor.hand.push(card);
      addInsight(state, playerId, "I'll Take That", card ? [getCardBaseId(card)] : [], `Bạn lấy lá rút kế tiếp của ${target.name}.`);
      state.log.push(`${actor.name} lấy trước lá rút kế tiếp.`);
      nowWithTurn(state, now);
      break;
    }
    case "ATTACK_OF_THE_DEAD": {
      const deadCount = state.players.filter((player) => !player.alive).length;
      finishOneTurn(state, now);
      state.pendingTurns += Math.max(1, deadCount + 1);
      state.log.push(`${actor.name} uses Attack of the Dead for ${deadCount + 2} turns.`);
      break;
    }
    case "CLAIRVOYANCE": {
      const target = getPlayer(state, action.targetPlayerId);
      addInsight(state, playerId, `Clairvoyance: ${target.name}`, target.hand.map(getCardBaseId), "You see this player's hand.");
      state.log.push(`${actor.name} uses Clairvoyance on ${target.name}.`);
      break;
    }
    case "CLONE": {
      const baseId = lastCloneableCardId(state);
      if (!baseId) {
        addInsight(state, playerId, "Clone", [], "No previous action card to copy.");
        break;
      }
      state.log.push(`${actor.name} clones ${getCardData(baseId)?.title ?? baseId}.`);
      applyAction(state, playerId, actionForCard(baseId, aliveOpponents(state, playerId)[0]?.id), now);
      break;
    }
    case "DIG_DEEPER": {
      if (state.drawPile.length === 0) break;
      const first = state.drawPile.pop()!;
      const second = state.drawPile.pop();
      if (second) {
        actor.hand.push(second);
        state.drawPile.push(first);
        addInsight(state, playerId, "Dig Deeper", [getCardBaseId(first), getCardBaseId(second)], "First card returned; you took the next card.");
      } else {
        actor.hand.push(first);
        addInsight(state, playerId, "Dig Deeper", [getCardBaseId(first)], "Only one card remained, so you took it.");
      }
      nowWithTurn(state, now);
      state.log.push(`${actor.name} digs deeper.`);
      break;
    }
    case "FEED_THE_DEAD": {
      const dead = action.targetPlayerId
        ? state.players.find((player) => player.id === action.targetPlayerId && !player.alive)
        : state.players.find((player) => !player.alive);
      if (!dead) {
        addInsight(state, playerId, "Feed the Dead", [], "No eliminated player can receive cards.");
        break;
      }
      for (const player of state.players.filter((candidate) => candidate.alive && candidate.id !== playerId && candidate.hand.length > 0)) {
        dead.hand.push(player.hand.shift()!);
      }
      state.log.push(`${actor.name} feeds cards to ${dead.name}.`);
      nowWithTurn(state, now);
      break;
    }
    case "GRAVE_ROBBER": {
      const deadPlayers = eliminatedPlayersWithCards(state);
      if (deadPlayers.length === 0) {
        addInsight(state, playerId, "Grave Robber", [], "No eliminated player has cards.");
        break;
      }
      const returned = deadPlayers.flatMap((dead) => dead.hand.splice(0, 1));
      state.drawPile = shuffle([...state.drawPile, ...returned], Math.random);
      addTableMessage(state, "Grave Robber", `${returned.length} dead-player cards were shuffled into the draw pile.`);
      nowWithTurn(state, now);
      break;
    }
    case "SHUFFLE_NOW":
      state.drawPile = shuffle(state.drawPile, Math.random);
      addTableMessage(state, "Shuffle Now", `${actor.name} shuffled the draw pile immediately.`);
      nowWithTurn(state, now);
      break;
    case "ARMAGEDDON": {
      const target = getPlayer(state, action.targetPlayerId!);
      const actorHasGodcat = actor.hand.findIndex((card) => getCardBaseId(card) === "godcat");
      const targetHasDevilcat = target.hand.findIndex((card) => getCardBaseId(card) === "devilcat");
      addTableMessage(
        state,
        "Armageddon",
        `${actor.name} thách đấu ${target.name}. Godcat bảo vệ người giữ nó; Devilcat đốt 1 lá của đối thủ. Nếu chưa có Godcat/Devilcat trên tay, ván không kết thúc ngẫu nhiên.`,
      );
      if (actorHasGodcat >= 0 && targetHasDevilcat >= 0) {
        const [godcat] = actor.hand.splice(actorHasGodcat, 1);
        const [devilcat] = target.hand.splice(targetHasDevilcat, 1);
        state.discardPile.push(godcat, devilcat);
        if (target.hand.length > 0) state.discardPile.push(target.hand.shift()!);
        state.log.push(`${actor.name} thắng Armageddon bằng Godcat; ${target.name} mất 1 lá.`);
      } else if (targetHasDevilcat >= 0 && actor.hand.length > 0) {
        state.discardPile.push(actor.hand.shift()!);
        state.log.push(`${target.name} phản công Armageddon bằng Devilcat; ${actor.name} mất 1 lá.`);
      } else if (actorHasGodcat >= 0) {
        addInsight(state, playerId, "Armageddon", ["godcat"], "Bạn có Godcat nên an toàn, nhưng đối thủ chưa có Devilcat để phân thắng bại.");
        state.log.push(`${actor.name} kích hoạt Armageddon nhưng chưa có Devilcat đối đầu.`);
      } else {
        addInsight(state, playerId, "Armageddon", [], "Không có Godcat/Devilcat trong tay hai bên, Armageddon chỉ cảnh báo và không loại ai.");
        state.log.push(`${actor.name} kích hoạt Armageddon nhưng chưa đủ lá Thiện/Ác để phân thắng bại.`);
      }
      nowWithTurn(state, now);
      break;
    }
    case "GODCAT":
      actor.hand.push(`defuse#godcat-${now}`);
      addInsight(state, playerId, "Godcat", ["defuse"], "Godcat grants a temporary Defuse.");
      nowWithTurn(state, now);
      break;
    case "DEVILCAT": {
      const target = action.targetPlayerId ? getPlayer(state, action.targetPlayerId) : aliveOpponents(state, playerId)[0];
      if (!target) break;
      if (target.hand.length > 0) state.discardPile.push(target.hand.shift()!);
      addInsight(state, target.id, "Devilcat", [], `${actor.name} burned one card from your hand.`);
      nowWithTurn(state, now);
      break;
    }
    case "RAISING_HECK": {
      const bombs = state.drawPile.filter((card) => getCardBaseId(card) === "exploding-kitten");
      const rest = state.drawPile.filter((card) => getCardBaseId(card) !== "exploding-kitten");
      state.drawPile = [...bombs, ...rest];
      addTableMessage(state, "Raising Heck", `${actor.name} pushed danger toward the bottom of the draw pile.`);
      nowWithTurn(state, now);
      break;
    }
    case "POTLUCK": {
      const returned: string[] = [];
      for (const player of state.players.filter((candidate) => candidate.alive && candidate.hand.length > 0)) {
        returned.push(player.hand.shift()!);
      }
      state.drawPile.push(...returned);
      addTableMessage(state, "Potluck", `${returned.length} players placed one card on top of the draw pile.`);
      nowWithTurn(state, now);
      break;
    }
    case "REVEAL": {
      const cards = state.drawPile.slice(-action.count).map(getCardBaseId).reverse();
      for (const player of state.players.filter((candidate) => candidate.connected)) {
        addInsight(state, player.id, `Reveal the Future ${cards.length}x`, cards, "All players see these cards.");
      }
      state.log.push(`${actor.name} reveals ${cards.length} future cards.`);
      break;
    }
    case "PROMPT":
      addInsight(state, playerId, "Cần chọn thêm", [], action.prompt);
      state.log.push(`${actor.name} đánh một lá cần lựa chọn thêm.`);
      break;
    case "CAT_COMBO":
      break;
  }
}

export function playCard({ state, playerId, cardInstanceId, targetPlayerId, now = Date.now() }: PlayCardInput): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (next.pendingAction) throw new Error("Cannot play another action while waiting for Nope");
  if (next.pendingDefuseExplosion) {
    throw new Error("Resolve Exploding Kitten with Defuse before playing another card");
  }
  assertNoBlockingInteraction(next);
  const player = getPlayer(next, playerId);
  if (currentPlayer(next)?.id !== playerId) throw new Error("Not this player's turn");
  const handIndex = player.hand.indexOf(cardInstanceId);
  if (handIndex < 0) throw new Error("Card is not in player's hand");

  const [played] = player.hand.splice(handIndex, 1);
  const baseId = getCardBaseId(played);
  const card = getCardData(baseId);
  if (!card) throw new Error(`Unknown card: ${baseId}`);
  if (baseId === "defuse" || baseId === "exploding-kitten" || baseId === "zombie-kitten") {
    throw new Error("This card cannot be played manually");
  }

  next.discardPile.push(played);
  const action = actionForCard(baseId, targetPlayerId);
  next.log.push(`${player.name} đánh ${card.title}.`);

  if (card.nopeable) {
    next.actionPrompt = "WAITING_FOR_NOPE";
    next.pendingAction = {
      id: `${played}:${now}`,
      sourcePlayerId: playerId,
      targetPlayerId,
      cardId: baseId,
      nopeCount: 0,
      expiresAt: now + 5000,
      action,
    };
  } else {
    applyAction(next, playerId, action, now);
  }

  if (next.status === "PLAYING") {
    if (next.pendingAction) {
      nowWithTurn(next, now);
    } else if (currentPlayer(next)?.id === playerId) {
      nowWithTurn(next, now);
    }
  }

  next.updatedAt = now;
  return next;
}

export function playNope(state: ServerGameState, playerId: PlayerId, cardInstanceId: string, now = Date.now()): ServerGameState {
  const next = cloneState(state);
  assertPlaying(next);
  if (!next.pendingAction) throw new Error("No action is waiting for Nope");
  const player = getPlayer(next, playerId);
  const index = player.hand.indexOf(cardInstanceId);
  if (index < 0 || getCardBaseId(cardInstanceId) !== "nope") throw new Error("Player does not have this Nope");
  const [nope] = player.hand.splice(index, 1);
  next.discardPile.push(nope);
  next.pendingAction.nopeCount += 1;
  next.pendingAction.expiresAt = now + 5000;
  next.log.push(`${player.name} đánh Nope.`);
  nowWithTurn(next, now);
  next.updatedAt = now;
  return next;
}

export function resolvePendingAction(state: ServerGameState, now = Date.now()): ServerGameState {
  const next = cloneState(state);
  if (next.status !== "PLAYING") return next;
  if (!next.pendingAction) return next;
  if (now < next.pendingAction.expiresAt) return next;

  const pending = next.pendingAction;
  next.pendingAction = undefined;
  next.actionPrompt = undefined;

  if (pending.nopeCount % 2 === 1) {
    next.log.push("Hành động bị hủy bởi Nope.");
    if (currentPlayer(next)?.id === pending.sourcePlayerId) {
      nowWithTurn(next, now);
    }
  } else {
    applyAction(next, pending.sourcePlayerId, pending.action, now);
    next.log.push("Hành động có hiệu lực sau thời gian chờ Nope.");
    if (currentPlayer(next)?.id === pending.sourcePlayerId) {
      nowWithTurn(next, now);
    }
  }

  next.updatedAt = now;
  return next;
}

export function resolveTurnTimeout(state: ServerGameState, now = Date.now()): ServerGameState {
  let next = resolvePendingAction(state, now);
  if (next.status !== "PLAYING" || next.pendingAction || hasBlockingInteraction(next) || now < next.turnExpiresAt) return next;
  const player = currentPlayer(next);
  if (!player) return next;
  next.log.push(`${player.name} hết 30 giây, hệ thống tự rút bài.`);
  next = drawCard(next, player.id, false, now);
  return next;
}

export function toClientGameState(state: ServerGameState, viewerId?: PlayerId): ClientGameState {
  return {
    id: state.id,
    targetDeckSize: state.targetDeckSize,
    status: state.status,
    players: state.players.map((player) => ({
      id: player.id,
      name: player.name,
      alive: player.alive,
      connected: player.connected,
      handCount: player.hand.length,
      hand: state.status === "PLAYING" && player.id === viewerId ? [...player.hand] : undefined,
    })),
    drawPileCount: state.drawPile.length,
    discardTop: state.discardPile.at(-1) ? getCardBaseId(state.discardPile.at(-1)!) : undefined,
    currentPlayerId: currentPlayer(state)?.id,
    direction: state.direction,
    pendingTurns: state.pendingTurns,
    turnStartedAt: state.turnStartedAt,
    turnExpiresAt: state.turnExpiresAt,
    winnerId: state.winnerId,
    actionPrompt: state.actionPrompt,
    pendingAction: state.pendingAction
      ? {
          id: state.pendingAction.id,
          sourcePlayerId: state.pendingAction.sourcePlayerId,
          targetPlayerId: state.pendingAction.targetPlayerId,
          cardId: state.pendingAction.cardId,
          nopeCount: state.pendingAction.nopeCount,
          expiresAt: state.pendingAction.expiresAt,
        }
      : undefined,
    insight: state.insights.find((insight) => insight.playerId === viewerId && insight.expiresAt > Date.now()),
    pendingDrawAlter:
      state.pendingDrawAlter && state.pendingDrawAlter.playerId === viewerId
        ? { count: state.pendingDrawAlter.count }
        : undefined,
    ownerPlayerId: state.ownerPlayerId,
    pendingBury:
      state.pendingBury && state.pendingBury.playerId === viewerId
        ? {
            cardBaseId: getCardBaseId(state.pendingBury.cardInstanceId),
            maxInsertIndex: state.drawPile.length,
          }
        : undefined,
    pendingShareFuture: (() => {
      const p = state.pendingShareFuture;
      if (!p || !viewerId) return undefined;
      const active = p.phase === "actor" ? p.actorId : p.nextPlayerId;
      if (viewerId !== active) {
        return {
          phase: p.phase,
          activePlayerId: active,
          nextPlayerId: p.nextPlayerId,
          count: p.orderedInstanceIds.length,
          reorderDrawTop: undefined,
        };
      }
      return {
        phase: p.phase,
        activePlayerId: active,
        nextPlayerId: p.nextPlayerId,
        count: p.orderedInstanceIds.length,
        reorderDrawTop: [...p.orderedInstanceIds],
      };
    })(),
    pendingShuffle: state.pendingShuffle?.playerId === viewerId ? true : undefined,
    pendingDefuseExplosion:
      state.pendingDefuseExplosion && state.pendingDefuseExplosion.playerId === viewerId
        ? {
            explodingCardBaseId: getCardBaseId(state.pendingDefuseExplosion.explodingCardInstanceId),
            maxInsertIndex: state.drawPile.length,
          }
        : undefined,
    lastExplosion: state.lastExplosion,
    pendingCatSteal: (() => {
      const p = state.pendingCatSteal;
      if (!p || !viewerId) return undefined;
      const target = state.players.find((pl) => pl.id === p.targetPlayerId);
      const stealer = state.players.find((pl) => pl.id === p.playerId);
      const targetName = target?.name ?? p.targetPlayerId;
      const stealerName = stealer?.name ?? p.playerId;
      if (viewerId === p.playerId) {
        return {
          type: "pick" as const,
          targetName,
          cards: (target?.hand ?? []).map((instanceId) => ({
            instanceId,
          })),
        };
      }
      if (viewerId === p.targetPlayerId) {
        return {
          type: "wait_pick" as const,
          stealerName,
          cardCount: target?.hand.length ?? 0,
        };
      }
      return undefined;
    })(),
    log: state.log.slice(-8),
    updatedAt: state.updatedAt,
  };
}

export function getActionPreview(state: ServerGameState, playerId: PlayerId, count: number) {
  getPlayer(state, playerId);
  return state.drawPile.slice(-count).map(getCardBaseId).reverse();
}
