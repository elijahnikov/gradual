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
  LegacyEvaluationReason,
  Reason,
} from "./types";

const DEFAULT_BASE_URL = "https://worker.gradual.so/api/v1";

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

function legacyReasonFromReasons(reasons: Reason[]): LegacyEvaluationReason {
  const first = reasons[0];
  if (!first) {
    return "DEFAULT_VARIATION";
  }
  switch (first.type) {
    case "rule_match":
      return "TARGET_MATCH";
    case "off":
      return "FLAG_DISABLED";
    case "error":
      return first.detail === "FLAG_NOT_FOUND" ? "FLAG_NOT_FOUND" : "ERROR";
    case "default":
      return reasons.some((r) => r.type === "percentage_rollout")
        ? "DEFAULT_ROLLOUT"
        : "DEFAULT_VARIATION";
    case "percentage_rollout":
      return reasons.some((r) => r.type === "default")
        ? "DEFAULT_ROLLOUT"
        : "TARGET_MATCH";
    default:
      return "DEFAULT_VARIATION";
  }
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

/** @deprecated Use EvaluationResult instead */
export interface EvalDetail {
  value: unknown;
  variationKey: string | undefined;
  reason: LegacyEvaluationReason;
  matchedTargetName?: string;
  errorDetail?: string;
  evaluationDurationUs?: number;
  flagConfigVersion?: number;
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
  private readonly updateListeners: Set<() => void> = new Set();
  private eventBuffer: EventBuffer | null = null;
  private readonly eventsEnabled: boolean;
  private readonly eventsFlushIntervalMs: number;
  private readonly eventsMaxBatchSize: number;

  readonly sync: GradualSync;

  constructor(options: GradualOptions) {
    this.apiKey = options.apiKey;
    this.environment = options.environment;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.eventsEnabled = options.events?.enabled ?? true;
    this.eventsFlushIntervalMs = options.events?.flushIntervalMs ?? 30_000;
    this.eventsMaxBatchSize = options.events?.maxBatchSize ?? 100;
    this.initPromise = this.init();

    this.sync = {
      isEnabled: this.isEnabledSync.bind(this),
      get: this.getSync.bind(this),
      evaluate: this.evaluateSync.bind(this),
      track: this.trackSync.bind(this),
    };

    const pollingEnabled = options.polling?.enabled ?? true;
    const pollingIntervalMs = options.polling?.intervalMs ?? 10_000;

    if (pollingEnabled) {
      this.initPromise.then(() => {
        setInterval(async () => {
          try {
            const previousVersion = this.snapshot?.version;
            await this.refresh();
            if (this.snapshot && this.snapshot.version !== previousVersion) {
              for (const cb of this.updateListeners) {
                cb();
              }
            }
          } catch (error) {
            console.warn("Gradual: Polling refresh failed", error);
          }
        }, pollingIntervalMs);
      });
    }
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
    };

    if (!initData.valid) {
      throw new Error(
        `Gradual: Invalid API key - ${initData.error ?? "Unknown error"}`
      );
    }

    const snapshotResponse = await fetch(
      `${this.baseUrl}/sdk/snapshot?environment=${encodeURIComponent(this.environment)}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    if (!snapshotResponse.ok) {
      const error = await snapshotResponse.json().catch(() => ({}));
      throw new Error(
        `Gradual: Failed to fetch snapshot - ${(error as { error?: string }).error ?? snapshotResponse.statusText}`
      );
    }

    this.snapshot = (await snapshotResponse.json()) as EnvironmentSnapshot;

    if (this.eventsEnabled && this.snapshot.meta) {
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

    const startTime = nowNs();
    let output: EvalOutput;
    try {
      output = evaluateFlag(flag, context, snapshot.segments ?? {});
    } catch (err) {
      const errorDetail = err instanceof Error ? err.message : String(err);
      output = {
        value: undefined,
        variationKey: undefined,
        legacyReason: "ERROR",
        reasons: [{ type: "error", detail: errorDetail }],
        errorDetail,
      };
    }

    return { output, snapshot, durationUs: elapsedUs(startTime) };
  }

  private buildResult<T>(
    key: string,
    output: EvalOutput,
    version: number
  ): EvaluationResult<T> {
    const ruleMatch = output.reasons.find(
      (r): r is Extract<Reason, { type: "rule_match" }> =>
        r.type === "rule_match"
    );

    return {
      key,
      value: output.value as T,
      variationKey: output.variationKey,
      reasons: output.reasons,
      ruleId: ruleMatch?.ruleId,
      version,
      evaluatedAt: new Date().toISOString(),
    };
  }

  private evaluateAndTrack(key: string, context: EvaluationContext): unknown {
    const { output, snapshot, durationUs } = this.evaluateRaw(key, context);

    if (!output) {
      this.trackEvent({
        flagKey: key,
        variationKey: undefined,
        value: undefined,
        reason: "FLAG_NOT_FOUND",
        reasons: [{ type: "error", detail: "FLAG_NOT_FOUND" }],
        context,
        flagConfigVersion: snapshot.version,
      });
      return undefined;
    }

    this.trackEvent({
      flagKey: key,
      variationKey: output.variationKey,
      value: output.value,
      reason: output.legacyReason,
      reasons: output.reasons,
      context,
      matchedTargetName: output.matchedTargetName,
      flagConfigVersion: snapshot.version,
      errorDetail: output.errorDetail,
      evaluationDurationUs: durationUs,
    });

    return output.value;
  }

  private trackEvent(params: {
    flagKey: string;
    variationKey: string | undefined;
    value: unknown;
    reason: LegacyEvaluationReason;
    reasons?: Reason[];
    evaluatedAt?: string;
    ruleId?: string;
    context: EvaluationContext;
    matchedTargetName?: string;
    flagConfigVersion?: number;
    errorDetail?: string;
    evaluationDurationUs?: number;
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
      flagKey: params.flagKey,
      variationKey: params.variationKey,
      value: params.value,
      reason: params.reason,
      reasons: params.reasons,
      evaluatedAt: params.evaluatedAt,
      ruleId: params.ruleId,
      contextKinds,
      contextKeys,
      timestamp: Date.now(),
      matchedTargetName: params.matchedTargetName,
      flagConfigVersion: params.flagConfigVersion,
      errorDetail: params.errorDetail,
      evaluationDurationUs: params.evaluationDurationUs,
      isAnonymous,
    });
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
      const result: EvaluationResult<T> = {
        key,
        value: undefined as T,
        variationKey: undefined,
        reasons: [{ type: "error", detail: "FLAG_NOT_FOUND" }],
        version: snapshot.version,
        evaluatedAt: new Date().toISOString(),
      };
      this.trackEvent({
        flagKey: key,
        variationKey: undefined,
        value: undefined,
        reason: "FLAG_NOT_FOUND",
        reasons: result.reasons,
        evaluatedAt: result.evaluatedAt,
        context,
        flagConfigVersion: snapshot.version,
      });
      return result;
    }

    const result = this.buildResult<T>(key, output, snapshot.version);

    this.trackEvent({
      flagKey: key,
      variationKey: output.variationKey,
      value: output.value,
      reason: output.legacyReason,
      reasons: output.reasons,
      evaluatedAt: result.evaluatedAt,
      ruleId: result.ruleId,
      context,
      matchedTargetName: output.matchedTargetName,
      flagConfigVersion: snapshot.version,
      errorDetail: output.errorDetail,
      evaluationDurationUs: durationUs,
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
    const { output, snapshot } = this.evaluateRaw(key, context);

    if (!output) {
      return {
        key,
        value: undefined as T,
        variationKey: undefined,
        reasons: [{ type: "error", detail: "FLAG_NOT_FOUND" }],
        version: snapshot.version,
        evaluatedAt: new Date().toISOString(),
      };
    }

    return this.buildResult<T>(key, output, snapshot.version);
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
      flagKey: key,
      variationKey: result.variationKey,
      value: result.value,
      reason: legacyReasonFromReasons(result.reasons),
      reasons: result.reasons,
      evaluatedAt: result.evaluatedAt,
      ruleId: result.ruleId,
      context: this.mergeContext({ context }),
      matchedTargetName: ruleMatch?.ruleName,
      flagConfigVersion: result.version,
    });
  }

  identify(context: EvaluationContext): void {
    this.identifiedContext = { ...context };
  }

  reset(): void {
    this.identifiedContext = {};
  }

  async refresh(): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/sdk/snapshot?environment=${encodeURIComponent(this.environment)}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        `Gradual: Failed to refresh - ${(error as { error?: string }).error ?? response.statusText}`
      );
    }

    this.snapshot = (await response.json()) as EnvironmentSnapshot;
  }

  getSnapshot(): EnvironmentSnapshot | null {
    return this.snapshot;
  }

  onUpdate(callback: () => void): () => void {
    this.updateListeners.add(callback);
    return () => this.updateListeners.delete(callback);
  }

  close(): void {
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
 * // result.value, result.reasons, result.ruleId, result.version
 *
 * // With user context
 * gradual.identify({ userId: '123', plan: 'pro' })
 * const proFeature = await gradual.isEnabled('pro-feature')
 * ```
 */
export function createGradual(options: GradualOptions): Gradual {
  return new GradualClient(options);
}
