import Pusher from "pusher";
import type { ClientGameState } from "@/game-engine";
import { getPusherEnv } from "./env";

function pusherClient() {
  const env = getPusherEnv();
  if (!env) return undefined;
  return new Pusher({ ...env, useTLS: true });
}

export class PusherService {
  private pusher = pusherClient();

  async triggerGameState(gameId: string, state: ClientGameState) {
    if (!this.pusher) return;
    await this.pusher.trigger(`game-${gameId}`, "gameState:update", state);
  }
}
