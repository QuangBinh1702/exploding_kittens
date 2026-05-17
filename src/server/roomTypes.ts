import type { CardExpansion } from "@/data/cardsData";

export interface RoomSettings {
  id: string;
  name: string;
  maxPlayers: number;
  /** Nếu có: chỉ chủ phòng được bắt đầu; chủ thoát ở sảnh chờ thì phòng bị xóa. */
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
  expansions: CardExpansion[];
  isPrivate: boolean;
  status: "LOBBY" | "PLAYING" | "FINISHED";
  updatedAt: number;
}
