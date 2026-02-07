import type { EvaluationBatchPayload, EvaluationEvent } from "./types";

export const SDK_VERSION = "0.6.1";

interface EventBufferOptions {
  baseUrl: string;
  apiKey: string;
  meta: {
    projectId: string;
    organizationId: string;
    environmentId: string;
  };
  flushIntervalMs: number;
  maxBatchSize: number;
}

export class EventBuffer {
  private readonly events: EvaluationEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly options: EventBufferOptions;

  constructor(options: EventBufferOptions) {
    this.options = options;
    this.timer = setInterval(() => this.flush(), this.options.flushIntervalMs);
  }

  push(event: EvaluationEvent): void {
    this.events.push(event);
    if (this.events.length >= this.options.maxBatchSize) {
      this.flush();
    }
  }

  flush(): void {
    if (this.events.length === 0) {
      return;
    }
    const batch = this.events.splice(0, this.options.maxBatchSize);
    const payload: EvaluationBatchPayload = {
      meta: {
        ...this.options.meta,
        sdkVersion: SDK_VERSION,
      },
      events: batch,
    };

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

  destroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush();
  }
}
