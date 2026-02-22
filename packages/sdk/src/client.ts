import { evaluateFlag } from "./evaluator";
import { EventBuffer } from "./event-buffer";
import type {
  EnvironmentSnapshot,
  EvalOutput,
  EvaluationContext,
  EvaluationResult,
  FlagOptions,
  GradualOptions,
  IsEnabledOptions,
  Reason,
} from "./types";

const DEFAULT_BASE_URL = "https://worker.gradual.so/api/v1";
const HTTPS_RE = /^https:\/\//;
const HTTP_RE = /^http:\/\//;

/**
 * Deterministic hash of context passed to identify().
 * Hashes all fields the user explicitly provides for MAU counting.
 */
function hashContext(context: EvaluationContext): string {
  const parts: string[] = [];
  const kinds = Object.keys(context).sort();
  for (const kind of kinds) {
    const attrs = context[kind] ?? {};
    const id = attrs.id ?? attrs.key;
    if (id !== undefined) {
      parts.push(`${kind}:${String(id)}`);
    }
  }
  const str = parts.join("|");
  let h1 = 5381;
  let h2 = 52_711;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1, 33) + c;
    h2 = Math.imul(h2, 31) + c;
  }
  const a = Math.abs(h1);
  const b = Math.abs(h2);
  return `${a.toString(36)}${b.toString(36)}`;
}

type SdkPlatform = "browser" | "node" | "react-native" | "edge" | "unknown";

function detectPlatform(): SdkPlatform {
  try {
    const g = globalThis as Record<string, unknown>;
    const nav = g.navigator as
      | { product?: string; userAgent?: string }
      | undefined;
    if (nav && nav.product === "ReactNative") {
      return "react-native";
    }
    const win = g.window as { document?: unknown } | undefined;
    if (win && typeof win.document !== "undefined") {
      return "browser";
    }
    const proc = g.process as { versions?: { node?: string } } | undefined;
    if (proc?.versions?.node) {
      return "node";
    }
    if (typeof globalThis !== "undefined") {
      return "edge";
    }
  } catch {
    // Ignore detection errors
  }
  return "unknown";
}

const SDK_PLATFORM = detectPlatform();

const proc = (globalThis as Record<string, unknown>).process as
  | { hrtime?: { bigint?: () => bigint } }
  | undefined;
const hasHrtime = typeof proc?.hrtime?.bigint === "function";

function nowNs(): bigint | number {
  if (hasHrtime) {
    // biome-ignore lint/style/noNonNullAssertion: guarded by hasHrtime check
    return proc!.hrtime!.bigint!();
  }
  if (typeof performance !== "undefined") {
    return performance.now();
  }
  return Date.now();
}

function elapsedUs(start: bigint | number): number {
  const end = nowNs();
  if (typeof start === "bigint" && typeof end === "bigint") {
    // hrtime bigint: nanoseconds → microseconds
    return Number((end - start) / 1000n);
  }
  // performance.now() ms or Date.now() ms → microseconds
  return Math.round(((end as number) - (start as number)) * 1000);
}

export interface Gradual {
  /** Wait for the SDK to be ready (snapshot fetched) */
  ready(): Promise<void>;

  /** Check if the SDK is ready for sync access */
  isReady(): boolean;

  /** Check if a boolean flag is enabled */
  isEnabled(key: string, options?: IsEnabledOptions): Promise<boolean>;

  /** Get a flag value with type inference from fallback */
  get<T>(key: string, options: FlagOptions<T>): Promise<T>;

  /** Evaluate a flag and return the full structured result (also tracks the evaluation) */
  evaluate<T = unknown>(
    key: string,
    options?: { context?: EvaluationContext }
  ): Promise<EvaluationResult<T>>;

  /** Set persistent user context for all evaluations */
  identify(context: EvaluationContext): void;

  /** Clear the identified user context */
  reset(): void;

  /** Refresh the snapshot from the server */
  refresh(): Promise<void>;

  /** Get the current snapshot (for debugging) */
  getSnapshot(): EnvironmentSnapshot | null;

  /** Subscribe to snapshot updates from polling (returns unsubscribe function) */
  onUpdate(callback: () => void): () => void;

  /** Flush pending evaluation events and stop the event buffer */
  close(): void;

  /** Sync methods (throw if not ready) */
  sync: GradualSync;
}

export interface GradualSync {
  /** Sync version of isEnabled (throws if not ready) */
  isEnabled(key: string, options?: IsEnabledOptions): boolean;

  /** Sync version of get (throws if not ready) */
  get<T>(key: string, options: FlagOptions<T>): T;

  /** Evaluate a flag without tracking. Use with track() for React-safe evaluation. */
  evaluate<T = unknown>(
    key: string,
    options?: { context?: EvaluationContext }
  ): EvaluationResult<T>;

  /** Manually track an evaluation that was produced by evaluate(). */
  track(
    key: string,
    result: EvaluationResult,
    context?: EvaluationContext
  ): void;
}

class GradualClient implements Gradual {
  private readonly apiKey: string;
  private readonly environment: string;
  private readonly baseUrl: string;
  private readonly initPromise: Promise<void>;
  private snapshot: EnvironmentSnapshot | null = null;
  private identifiedContext: EvaluationContext = {};
  private identityHash: string | null = null;
  private identityHashSent = false;
  private mauLimitReached = false;
  private readonly updateListeners: Set<() => void> = new Set();
  private eventBuffer: EventBuffer | null = null;
  private etag: string | null = null;
  private readonly eventsEnabled: boolean;
  private readonly eventsFlushIntervalMs: number;
  private readonly eventsMaxBatchSize: number;
  private readonly realtimeEnabled: boolean;
  private readonly pollingEnabled: boolean;
  private readonly pollingIntervalMs: number;
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  readonly sync: GradualSync;

  constructor(options: GradualOptions) {
    this.apiKey = options.apiKey;
    this.environment = options.environment;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.eventsEnabled = options.events?.enabled ?? true;
    this.eventsFlushIntervalMs = options.events?.flushIntervalMs ?? 30_000;
    this.eventsMaxBatchSize = options.events?.maxBatchSize ?? 100;

    const hasWebSocket = typeof globalThis.WebSocket !== "undefined";
    this.realtimeEnabled = options.realtime?.enabled ?? hasWebSocket;
    this.pollingEnabled = options.polling?.enabled ?? true;
    this.pollingIntervalMs = options.polling?.intervalMs ?? 10_000;

    this.initPromise = this.init();

    this.sync = {
      isEnabled: this.isEnabledSync.bind(this),
      get: this.getSync.bind(this),
      evaluate: this.evaluateSync.bind(this),
      track: this.trackSync.bind(this),
    };
  }

  private async init(): Promise<void> {
    const initResponse = await fetch(`${this.baseUrl}/sdk/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: this.apiKey }),
    });

    if (!initResponse.ok) {
      const error = await initResponse.json().catch(() => ({}));
      throw new Error(
        `Gradual: Failed to initialize - ${(error as { error?: string }).error ?? initResponse.statusText}`
      );
    }

    const initData = (await initResponse.json()) as {
      valid: boolean;
      error?: string;
      mauLimitReached?: boolean;
    };

    if (!initData.valid) {
      throw new Error(
        `Gradual: Invalid API key - ${initData.error ?? "Unknown error"}`
      );
    }

    if (initData.mauLimitReached) {
      this.mauLimitReached = true;
    }

    if (this.realtimeEnabled) {
      await this.connectWebSocket();
    } else {
      await this.fetchSnapshot();
      this.startPolling();
    }

    this.initializeEventBuffer();
  }

  private initializeEventBuffer(): void {
    if (this.eventsEnabled && this.snapshot?.meta) {
      this.eventBuffer = new EventBuffer({
        baseUrl: this.baseUrl,
        apiKey: this.apiKey,
        meta: {
          projectId: this.snapshot.meta.projectId,
          organizationId: this.snapshot.meta.organizationId,
          environmentId: this.snapshot.meta.environmentId,
          sdkPlatform: SDK_PLATFORM,
        },
        flushIntervalMs: this.eventsFlushIntervalMs,
        maxBatchSize: this.eventsMaxBatchSize,
      });
    }
  }

  private async fetchSnapshot(): Promise<void> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.etag) {
      headers["If-None-Match"] = this.etag;
    }

    const response = await fetch(
      `${this.baseUrl}/sdk/snapshot?environment=${encodeURIComponent(this.environment)}`,
      { headers }
    );

    if (response.status === 304) {
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Gradual: Failed to fetch snapshot - ${(error as { error?: string }).error ?? response.statusText}`
      );
    }

    const etag = response.headers.get("ETag");
    if (etag) {
      this.etag = etag;
    }
    this.snapshot = (await response.json()) as EnvironmentSnapshot;
  }

  private startPolling(): void {
    if (!this.pollingEnabled) {
      return;
    }
    this.pollingTimer = setInterval(async () => {
      try {
        const previousVersion = this.snapshot?.version;
        await this.fetchSnapshot();
        if (this.snapshot && this.snapshot.version !== previousVersion) {
          for (const cb of this.updateListeners) {
            cb();
          }
        }
      } catch (error) {
        console.warn("Gradual: Polling refresh failed", error);
      }
    }, this.pollingIntervalMs);
  }

  private connectWebSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const wsBase = this.baseUrl
        .replace(HTTPS_RE, "wss://")
        .replace(HTTP_RE, "ws://");
      const wsUrl = `${wsBase}/sdk/connect?apiKey=${encodeURIComponent(this.apiKey)}&environment=${encodeURIComponent(this.environment)}`;

      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      let resolved = false;

      ws.onmessage = (event: MessageEvent) => {
        try {
          const newSnapshot = JSON.parse(
            typeof event.data === "string" ? event.data : ""
          ) as EnvironmentSnapshot;
          const previousVersion = this.snapshot?.version;
          this.snapshot = newSnapshot;

          if (newSnapshot.version) {
            this.etag = `"${newSnapshot.version}"`;
          }

          if (!resolved) {
            resolved = true;
            this.reconnectAttempts = 0;
            resolve();
          } else if (newSnapshot.version !== previousVersion) {
            for (const cb of this.updateListeners) {
              cb();
            }
          }
        } catch (err) {
          console.warn("Gradual: Failed to parse WebSocket message", err);
          if (!resolved) {
            resolved = true;
            this.fallbackToPolling(resolve, reject);
          }
        }
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          ws.close();
          this.ws = null;
          this.fallbackToPolling(resolve, reject);
        }
      };

      ws.onclose = () => {
        if (!resolved) {
          resolved = true;
          this.ws = null;
          this.fallbackToPolling(resolve, reject);
          return;
        }
        // Already connected — schedule reconnect
        this.ws = null;
        this.scheduleReconnect();
      };
    });
  }

  private fallbackToPolling(
    resolve: () => void,
    reject: (err: Error) => void
  ): void {
    console.warn("Gradual: WebSocket failed, falling back to polling");
    this.fetchSnapshot()
      .then(() => {
        this.startPolling();
        resolve();
      })
      .catch(reject);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectWebSocket();
    }, delay);
  }

  private reconnectWebSocket(): void {
    const wsBase = this.baseUrl
      .replace(HTTPS_RE, "wss://")
      .replace(HTTP_RE, "ws://");
    const wsUrl = `${wsBase}/sdk/connect?apiKey=${encodeURIComponent(this.apiKey)}&environment=${encodeURIComponent(this.environment)}`;

    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onmessage = (event: MessageEvent) => {
      try {
        const newSnapshot = JSON.parse(
          typeof event.data === "string" ? event.data : ""
        ) as EnvironmentSnapshot;
        const previousVersion = this.snapshot?.version;
        this.snapshot = newSnapshot;
        this.reconnectAttempts = 0;

        if (newSnapshot.version !== previousVersion) {
          for (const cb of this.updateListeners) {
            cb();
          }
        }
      } catch (err) {
        console.warn("Gradual: Failed to parse WebSocket message", err);
      }
    };

    ws.onerror = () => {
      // onclose will fire after this
    };

    ws.onclose = () => {
      this.ws = null;
      this.scheduleReconnect();
    };
  }

  private ensureReady(): EnvironmentSnapshot {
    if (!this.snapshot) {
      throw new Error(
        "Gradual: SDK not ready. Use await ready() or async methods."
      );
    }
    return this.snapshot;
  }

  private mergeContext(options?: {
    context?: EvaluationContext;
  }): EvaluationContext {
    const merged: EvaluationContext = {};
    const allKinds = new Set([
      ...Object.keys(this.identifiedContext),
      ...Object.keys(options?.context ?? {}),
    ]);
    for (const kind of allKinds) {
      merged[kind] = {
        ...this.identifiedContext[kind],
        ...options?.context?.[kind],
      };
    }
    return merged;
  }

  private evaluateRaw(
    key: string,
    context: EvaluationContext
  ): {
    output: EvalOutput | null;
    snapshot: EnvironmentSnapshot;
    durationUs: number;
  } {
    const snapshot = this.ensureReady();
    if (!snapshot.flags) {
      return { output: null, snapshot, durationUs: 0 };
    }
    const flag = snapshot.flags[key];
    if (!flag) {
      return { output: null, snapshot, durationUs: 0 };
    }

    // If MAU limit reached and user not identified, return off variation
    if (this.mauLimitReached && !this.identityHash) {
      const offVariation = flag.variations[flag.offVariationKey];
      return {
        output: {
          value: offVariation?.value,
          variationKey: flag.offVariationKey,
          reasons: [
            {
              type: "error",
              detail: "MAU_LIMIT_REACHED",
            },
          ],
        },
        snapshot,
        durationUs: 0,
      };
    }

    const startTime = nowNs();
    let output: EvalOutput;
    try {
      output = evaluateFlag(flag, context, snapshot.segments ?? {});
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      output = {
        value: undefined,
        variationKey: undefined,
        reasons: [{ type: "error", detail: errorDetail }],
        errorDetail,
      };
    }

    return { output, snapshot, durationUs: elapsedUs(startTime) };
  }

  private buildResult<T>(
    key: string,
    output: EvalOutput,
    flagVersion: number,
    durationUs?: number
  ): EvaluationResult<T> {
    const ruleMatch = output.reasons.find(
      (r): r is Extract<Reason, { type: "rule_match" }> =>
        r.type === "rule_match"
    );

    return {
      schemaVersion: 1,
      key,
      value: output.value as T,
      variationKey: output.variationKey,
      reasons: output.reasons,
      ruleId: ruleMatch?.ruleId,
      flagVersion,
      evaluatedAt: new Date().toISOString(),
      evaluationDurationUs: durationUs,
      inputsUsed: output.inputsUsed,
      traceId: crypto.randomUUID(),
    };
  }

  private evaluateAndTrack(key: string, context: EvaluationContext): unknown {
    const { output, snapshot, durationUs } = this.evaluateRaw(key, context);
    const evaluatedAt = new Date().toISOString();
    const traceId = crypto.randomUUID();

    if (!output) {
      this.trackEvent({
        key,
        variationKey: undefined,
        value: undefined,
        reasons: [{ type: "error", detail: "FLAG_NOT_FOUND" }],
        context,
        flagVersion: snapshot.version,
        schemaVersion: 1,
        evaluatedAt,
        traceId,
      });
      return undefined;
    }

    this.trackEvent({
      key,
      variationKey: output.variationKey,
      value: output.value,
      reasons: output.reasons,
      context,
      matchedTargetName: output.matchedTargetName,
      flagVersion: snapshot.version,
      errorDetail: output.errorDetail,
      evaluationDurationUs: durationUs,
      schemaVersion: 1,
      evaluatedAt,
      inputsUsed: output.inputsUsed,
      traceId,
    });

    return output.value;
  }

  private trackEvent(params: {
    key: string;
    variationKey: string | undefined;
    value: unknown;
    reasons: Reason[];
    evaluatedAt?: string;
    ruleId?: string;
    context: EvaluationContext;
    matchedTargetName?: string;
    flagVersion?: number;
    errorDetail?: string;
    evaluationDurationUs?: number;
    schemaVersion?: 1;
    policyVersion?: number;
    inputsUsed?: string[];
    traceId?: string;
  }): void {
    if (!this.eventBuffer) {
      return;
    }
    const { context } = params;
    const contextKinds = Object.keys(context);
    const contextKeys: Record<string, string[]> = {};
    for (const kind of contextKinds) {
      contextKeys[kind] = Object.keys(context[kind] ?? {});
    }

    const isAnonymous =
      contextKinds.length === 0 ||
      contextKinds.every(
        (kind) => Object.keys(context[kind] ?? {}).length === 0
      );

    this.eventBuffer.push({
      schemaVersion: params.schemaVersion ?? 1,
      key: params.key,
      variationKey: params.variationKey,
      value: params.value,
      reasons: params.reasons,
      evaluatedAt: params.evaluatedAt ?? new Date().toISOString(),
      ruleId: params.ruleId,
      flagVersion: params.flagVersion ?? 0,
      policyVersion: params.policyVersion,
      inputsUsed: params.inputsUsed,
      traceId: params.traceId,
      contextKinds,
      contextKeys,
      contextIdentityHash: this.getAndMarkIdentityHash(),
      timestamp: Date.now(),
      matchedTargetName: params.matchedTargetName,
      errorDetail: params.errorDetail,
      evaluationDurationUs: params.evaluationDurationUs,
      isAnonymous,
    });
  }

  private getAndMarkIdentityHash(): string | undefined {
    if (this.identityHash && !this.identityHashSent) {
      this.identityHashSent = true;
      return this.identityHash;
    }
    return undefined;
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  isReady(): boolean {
    return this.snapshot !== null;
  }

  async isEnabled(key: string, options?: IsEnabledOptions): Promise<boolean> {
    await this.initPromise;
    const value = this.evaluateAndTrack(key, this.mergeContext(options));
    return typeof value === "boolean" ? value : false;
  }

  async get<T>(key: string, options: FlagOptions<T>): Promise<T> {
    await this.initPromise;
    const value = this.evaluateAndTrack(key, this.mergeContext(options));
    return value !== undefined && value !== null
      ? (value as T)
      : options.fallback;
  }

  async evaluate<T = unknown>(
    key: string,
    options?: { context?: EvaluationContext }
  ): Promise<EvaluationResult<T>> {
    await this.initPromise;
    const context = this.mergeContext(options);
    const { output, snapshot, durationUs } = this.evaluateRaw(key, context);

    if (!output) {
      const traceId = crypto.randomUUID();
      const evaluatedAt = new Date().toISOString();
      const result: EvaluationResult<T> = {
        schemaVersion: 1,
        key,
        value: undefined as T,
        variationKey: undefined,
        reasons: [{ type: "error", detail: "FLAG_NOT_FOUND" }],
        flagVersion: snapshot.version,
        evaluatedAt,
        traceId,
      };
      this.trackEvent({
        key,
        variationKey: undefined,
        value: undefined,
        reasons: result.reasons,
        evaluatedAt,
        context,
        flagVersion: snapshot.version,
        schemaVersion: 1,
        traceId,
      });
      return result;
    }

    const result = this.buildResult<T>(
      key,
      output,
      snapshot.version,
      durationUs
    );

    this.trackEvent({
      key,
      variationKey: output.variationKey,
      value: output.value,
      reasons: output.reasons,
      evaluatedAt: result.evaluatedAt,
      ruleId: result.ruleId,
      context,
      matchedTargetName: output.matchedTargetName,
      flagVersion: snapshot.version,
      errorDetail: output.errorDetail,
      evaluationDurationUs: durationUs,
      schemaVersion: 1,
      inputsUsed: output.inputsUsed,
      traceId: result.traceId,
    });

    return result;
  }

  private isEnabledSync(key: string, options?: IsEnabledOptions): boolean {
    const value = this.evaluateAndTrack(key, this.mergeContext(options));
    return typeof value === "boolean" ? value : false;
  }

  private getSync<T>(key: string, options: FlagOptions<T>): T {
    const value = this.evaluateAndTrack(key, this.mergeContext(options));
    return value !== undefined && value !== null
      ? (value as T)
      : options.fallback;
  }

  private evaluateSync<T = unknown>(
    key: string,
    options?: { context?: EvaluationContext }
  ): EvaluationResult<T> {
    const context = this.mergeContext(options);
    const { output, snapshot, durationUs } = this.evaluateRaw(key, context);

    if (!output) {
      return {
        schemaVersion: 1,
        key,
        value: undefined as T,
        variationKey: undefined,
        reasons: [{ type: "error", detail: "FLAG_NOT_FOUND" }],
        flagVersion: snapshot.version,
        evaluatedAt: new Date().toISOString(),
        evaluationDurationUs: durationUs,
        traceId: crypto.randomUUID(),
      };
    }

    return this.buildResult<T>(key, output, snapshot.version, durationUs);
  }

  private trackSync(
    key: string,
    result: EvaluationResult,
    context?: EvaluationContext
  ): void {
    const ruleMatch = result.reasons.find(
      (r): r is Extract<Reason, { type: "rule_match" }> =>
        r.type === "rule_match"
    );

    this.trackEvent({
      key,
      variationKey: result.variationKey,
      value: result.value,
      reasons: result.reasons,
      evaluatedAt: result.evaluatedAt,
      ruleId: result.ruleId,
      context: this.mergeContext({ context }),
      matchedTargetName: ruleMatch?.ruleName,
      flagVersion: result.flagVersion,
      evaluationDurationUs: result.evaluationDurationUs,
      schemaVersion: result.schemaVersion,
      policyVersion: result.policyVersion,
      inputsUsed: result.inputsUsed,
      traceId: result.traceId,
    });
  }

  identify(context: EvaluationContext): void {
    this.identifiedContext = { ...context };
    this.identityHash = hashContext(context);
    this.identityHashSent = false;
  }

  reset(): void {
    this.identifiedContext = {};
    this.identityHash = null;
    this.identityHashSent = false;
  }

  async refresh(): Promise<void> {
    await this.fetchSnapshot();
  }

  getSnapshot(): EnvironmentSnapshot | null {
    return this.snapshot;
  }

  onUpdate(callback: () => void): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.eventBuffer) {
      this.eventBuffer.destroy();
      this.eventBuffer = null;
    }
  }
}

/**
 * Create a Gradual feature flag client
 *
 * @example
 * ```ts
 * const gradual = createGradual({
 *   apiKey: 'gra_xxx',
 *   environment: 'production'
 * })
 *
 * // Boolean flags
 * const enabled = await gradual.isEnabled('new-feature')
 *
 * // Typed values (inferred from fallback)
 * const theme = await gradual.get('theme', { fallback: 'dark' })
 *
 * // Full structured result
 * const result = await gradual.evaluate('new-feature')
 * // result.value, result.reasons, result.ruleId, result.flagVersion
 *
 * // With user context
 * gradual.identify({ userId: '123', plan: 'pro' })
 * const proFeature = await gradual.isEnabled('pro-feature')
 * ```
 */
export function createGradual(options: GradualOptions): Gradual {
  return new GradualClient(options);
}
