import type { CardExpansion } from "@/data/cardsData";

export interface RoomSettings {
  id: string;
  name: string;
  maxPlayers: number;
  targetDeckSize?: number;
  ownerPlayerId?: string;
  expansions: CardExpansion[];
  isPrivate: boolean;
  passwordHash?: string;
  createdAt: number;
  updatedAt: number;
}

export interface PublicRoomSummary {
  id: string;
  name: string;
  maxPlayers: number;
  connectedPlayers: number;
  alivePlayers: number;
  drawPileCount: number;
  targetDeckSize?: number;
  expansions: CardExpansion[];
  isPrivate: boolean;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  updatedAt: number;
}
