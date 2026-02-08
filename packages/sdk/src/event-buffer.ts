import type { EvaluationBatchPayload, EvaluationEvent } from "./types";

declare const __SDK_VERSION__: string;
export const SDK_VERSION = __SDK_VERSION__;

interface EventBufferOptions {
  baseUrl: string;
  apiKey: string;
  meta: {
    projectId: string;
    organizationId: string;
    environmentId: string;
    sdkPlatform?: string;
  };
  flushIntervalMs: number;
  maxBatchSize: number;
}

const g = globalThis as Record<string, unknown>;
const doc = g.document as
  | {
      visibilityState?: string;
      addEventListener?: (event: string, handler: () => void) => void;
      removeEventListener?: (event: string, handler: () => void) => void;
    }
  | undefined;
export class EventBuffer {
  private readonly events: EvaluationEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly options: EventBufferOptions;
  private readonly onVisibilityChange: (() => void) | null = null;

  constructor(options: EventBufferOptions) {
    this.options = options;
    this.timer = setInterval(() => this.flush(), this.options.flushIntervalMs);

    if (doc?.addEventListener) {
      this.onVisibilityChange = () => {
        if (doc.visibilityState === "hidden") {
          this.flushBeacon();
        }
      };
      doc.addEventListener("visibilitychange", this.onVisibilityChange);
    }
  }

  push(event: EvaluationEvent): void {
    this.events.push(event);
    if (this.events.length >= this.options.maxBatchSize) {
      this.flush();
    }
  }

  private buildPayload(batch: EvaluationEvent[]): EvaluationBatchPayload {
    return {
      meta: {
        ...this.options.meta,
        sdkVersion: SDK_VERSION,
      },
      events: batch,
    };
  }

  flush(): void {
    if (this.events.length === 0) {
      return;
    }
    const batch = this.events.splice(0, this.options.maxBatchSize);
    const payload = this.buildPayload(batch);

    fetch(`${this.options.baseUrl}/sdk/evaluations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {
      // Fire-and-forget: silently drop failed events to prevent unbounded growth
    });
  }

  /**
   * Flush with keepalive flag for reliable delivery during page unload.
   * keepalive fetch survives page navigation like sendBeacon but supports headers.
   */
  private flushBeacon(): void {
    if (this.events.length === 0) {
      return;
    }

    const batch = this.events.splice(0, this.options.maxBatchSize);
    const payload = this.buildPayload(batch);

    fetch(`${this.options.baseUrl}/sdk/evaluations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Fire-and-forget
    });
  }

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.onVisibilityChange && doc?.removeEventListener) {
      doc.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
    this.flush();
  }
}
