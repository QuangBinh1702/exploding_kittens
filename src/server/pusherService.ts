import Pusher from "pusher";
import type { ClientGameState } from "@/game-engine";

function pusherClient() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
  if (!appId || !key || !secret || !cluster) return undefined;
  return new Pusher({ appId, key, secret, cluster, useTLS: true });
}

export class PusherService {
  private pusher = pusherClient();

  async triggerGameState(gameId: string, state: ClientGameState) {
    if (!this.pusher) return;
    await this.pusher.trigger(`game-${gameId}`, "gameState:update", state);
  }
}
