import type { CardExpansion } from "@/data/cardsData";

export type PlayerId = string;
export type GameStatus = "LOBBY" | "PLAYING" | "FINISHED";
export type Direction = 1 | -1;

export interface PlayerState {
  id: PlayerId;
  name: string;
  hand: string[];
  alive: boolean;
  connected: boolean;
}

export interface PublicPlayerState {
  id: PlayerId;
  name: string;
  handCount: number;
  alive: boolean;
  connected: boolean;
  hand?: string[];
}

export interface PlayerInsight {
  playerId: PlayerId;
  title: string;
  /** Base card ids for display (see / alter previews). */
  cards: string[];
  /** When set, full instance ids in draw order (index 0 = next draw). Used for Alter the Future reorder. */
  reorderDrawTop?: string[];
  message?: string;
  expiresAt: number;
}

export interface PendingAction {
  id: string;
  sourcePlayerId: PlayerId;
  targetPlayerId?: PlayerId;
  cardId: string;
  nopeCount: number;
  expiresAt: number;
  action: GameAction;
}

export interface ServerGameState {
  id: string;
  status: GameStatus;
  ownerPlayerId?: PlayerId;
  targetDeckSize?: number;
  players: PlayerState[];
  drawPile: string[];
  discardPile: string[];
  currentPlayerIndex: number;
  direction: Direction;
  pendingTurns: number;
  turnStartedAt: number;
  turnExpiresAt: number;
  winnerId?: PlayerId;
  actionPrompt?: "WAITING_FOR_NOPE";
  pendingAction?: PendingAction;
  insights: PlayerInsight[];
  /** After Alter the Future resolves, the actor must confirm the new top-of-deck order. */
  pendingDrawAlter?: { playerId: PlayerId; count: number };
  /** Bury: top card removed; player picks insert index 0..drawPile.length. */
  pendingBury?: { playerId: PlayerId; cardInstanceId: string };
  /** Share the Future: actor then next player reorder top N before putting back. */
  pendingShareFuture?: {
    actorId: PlayerId;
    nextPlayerId: PlayerId;
    phase: "actor" | "next";
    orderedInstanceIds: string[];
  };
  /** Shuffle card: confirm button applies random shuffle. */
  pendingShuffle?: { playerId: PlayerId };
  /** Drew Exploding Kitten and hold defuse — choose deck insert index. */
  pendingDefuseExplosion?: { playerId: PlayerId; explodingCardInstanceId: string };
  /** Two-cat combo played; stealer must choose one card from target's hand. */
  pendingCatSteal?: { playerId: PlayerId; targetPlayerId: PlayerId };
  lastExplosion?: { playerId: PlayerId; playerName: string; cardId: string; eliminated: boolean; at: number };
  expansions: CardExpansion[];
  log: string[];
  updatedAt: number;
}

export interface ClientGameState {
  id: string;
  roomName?: string;
  targetDeckSize?: number;
  status: GameStatus;
  players: PublicPlayerState[];
  drawPileCount: number;
  discardTop?: string;
  currentPlayerId?: PlayerId;
  direction: Direction;
  pendingTurns: number;
  turnStartedAt: number;
  turnExpiresAt: number;
  winnerId?: PlayerId;
  actionPrompt?: "WAITING_FOR_NOPE";
  pendingAction?: Omit<PendingAction, "action">;
  insight?: PlayerInsight;
  /** Present for the current viewer when they must finish an Alter the Future reorder. */
  pendingDrawAlter?: { count: number };
  ownerPlayerId?: PlayerId;
  pendingBury?: { cardBaseId: string; maxInsertIndex: number };
  pendingShareFuture?: {
    phase: "actor" | "next";
    activePlayerId: PlayerId;
    nextPlayerId: PlayerId;
    count: number;
    reorderDrawTop?: string[];
  };
  pendingShuffle?: boolean;
  pendingDefuseExplosion?: { explodingCardBaseId: string; maxInsertIndex: number };
  /** After 2-cat combo: stealer picks a card; victim sees wait state. */
  pendingCatSteal?:
    | {
        type: "pick";
        targetName: string;
        cards: readonly { instanceId: string }[];
      }
    | {
        type: "wait_pick";
        stealerName: string;
        cardCount: number;
      };
  lastExplosion?: { playerId: PlayerId; playerName: string; cardId: string; eliminated: boolean; at: number };
  log: string[];
  updatedAt: number;
}

export type GameAction =
  | { type: "ATTACK"; turns: number }
  | { type: "TARGETED_ATTACK"; targetPlayerId: PlayerId; turns: number }
  | { type: "PERSONAL_ATTACK"; turns: number }
  | { type: "SKIP"; allTurns?: boolean }
  | { type: "REVERSE" }
  | { type: "SHUFFLE" }
  | { type: "SEE"; count: number }
  | { type: "ALTER"; count: number }
  | { type: "BURY" }
  | { type: "SHARE_FUTURE"; count: number }
  | { type: "DRAW_FROM_BOTTOM" }
  | { type: "SWAP_TOP_BOTTOM" }
  | { type: "CATOMIC_BOMB" }
  | { type: "FAVOR"; targetPlayerId: PlayerId }
  | { type: "MARK"; targetPlayerId: PlayerId }
  | { type: "CURSE_OF_CAT_BUTT"; targetPlayerId: PlayerId }
  | { type: "BARKING_KITTEN"; targetPlayerId?: PlayerId }
  | { type: "TOWER_OF_POWER" }
  | { type: "ILL_TAKE_THAT"; targetPlayerId?: PlayerId }
  | { type: "ATTACK_OF_THE_DEAD" }
  | { type: "CLAIRVOYANCE"; targetPlayerId: PlayerId }
  | { type: "CLONE" }
  | { type: "DIG_DEEPER" }
  | { type: "FEED_THE_DEAD"; targetPlayerId?: PlayerId }
  | { type: "GRAVE_ROBBER"; targetPlayerId?: PlayerId }
  | { type: "SHUFFLE_NOW" }
  | { type: "ARMAGEDDON"; targetPlayerId?: PlayerId }
  | { type: "GODCAT" }
  | { type: "DEVILCAT"; targetPlayerId?: PlayerId }
  | { type: "RAISING_HECK" }
  | { type: "POTLUCK" }
  | { type: "REVEAL"; count: number }
  | { type: "PROMPT"; prompt: string }
  | { type: "CAT_COMBO" };

export interface InitializeGameInput {
  id: string;
  players: Array<{ id: PlayerId; name: string }>;
  expansions?: CardExpansion[];
  targetDeckSize?: number;
  random?: () => number;
}

export interface PlayCardInput {
  state: ServerGameState;
  playerId: PlayerId;
  cardInstanceId: string;
  targetPlayerId?: PlayerId;
  now?: number;
}
