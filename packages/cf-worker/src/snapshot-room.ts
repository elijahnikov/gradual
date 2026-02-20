import { DurableObject } from "cloudflare:workers";

interface Env {
  GRADUAL_SNAPSHOT: KVNamespace;
}

export class SnapshotRoom extends DurableObject<Env> {
  private cachedSnapshot: string | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Path 1: WebSocket upgrade from SDK client
    if (request.headers.get("Upgrade") === "websocket") {
      // biome-ignore lint/correctness/noUndeclaredVariables: Cloudflare Workers global
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);

      // Send current snapshot immediately
      if (!this.cachedSnapshot) {
        const snapshotKey = url.searchParams.get("snapshotKey");
        if (snapshotKey) {
          this.cachedSnapshot =
            await this.env.GRADUAL_SNAPSHOT.get(snapshotKey);
        }
      }
      if (this.cachedSnapshot) {
        pair[1].send(this.cachedSnapshot);
      }

      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    // Path 2: POST from main worker — broadcast new snapshot
    if (request.method === "POST") {
      const snapshot = await request.text();
      this.cachedSnapshot = snapshot;
      for (const ws of this.ctx.getWebSockets()) {
        ws.send(snapshot);
      }
      return new Response("ok");
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketClose(): Promise<void> {
    // No cleanup needed — hibernation API manages connections
  }

  async webSocketError(): Promise<void> {
    // No cleanup needed — hibernation API manages connections
  }
}
