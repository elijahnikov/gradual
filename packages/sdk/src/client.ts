import { evaluateFlag } from "./evaluator";
import type {
  EnvironmentSnapshot,
  EvaluationContext,
  FlagOptions,
  GradualOptions,
  IsEnabledOptions,
} from "./types";

const DEFAULT_BASE_URL = "https://worker.gradual.so/api/v1";

export interface Gradual {
  /** Wait for the SDK to be ready (snapshot fetched) */
  ready(): Promise<void>;

  /** Check if the SDK is ready for sync access */
  isReady(): boolean;

  /** Check if a boolean flag is enabled */
  isEnabled(key: string, options?: IsEnabledOptions): Promise<boolean>;

  /** Get a flag value with type inference from fallback */
  get<T>(key: string, options: FlagOptions<T>): Promise<T>;

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

  /** Sync methods (throw if not ready) */
  sync: GradualSync;
}

export interface GradualSync {
  /** Sync version of isEnabled (throws if not ready) */
  isEnabled(key: string, options?: IsEnabledOptions): boolean;

  /** Sync version of get (throws if not ready) */
  get<T>(key: string, options: FlagOptions<T>): T;
}

class GradualClient implements Gradual {
  private readonly apiKey: string;
  private readonly environment: string;
  private readonly baseUrl: string;
  private readonly initPromise: Promise<void>;
  private snapshot: EnvironmentSnapshot | null = null;
  private identifiedContext: EvaluationContext = {};
  private readonly updateListeners: Set<() => void> = new Set();

  readonly sync: GradualSync;

  constructor(options: GradualOptions) {
    this.apiKey = options.apiKey;
    this.environment = options.environment;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.initPromise = this.init();

    this.sync = {
      isEnabled: this.isEnabledSync.bind(this),
      get: this.getSync.bind(this),
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

  private evaluate(key: string, context: EvaluationContext): unknown {
    const snapshot = this.ensureReady();
    if (!snapshot.flags) {
      return undefined;
    }
    const flag = snapshot.flags[key];
    if (!flag) {
      return undefined;
    }
    return evaluateFlag(flag, context, snapshot.segments ?? {});
  }

  async ready(): Promise<void> {
    await this.initPromise;
  }

  isReady(): boolean {
    return this.snapshot !== null;
  }

  async isEnabled(key: string, options?: IsEnabledOptions): Promise<boolean> {
    await this.initPromise;
    const value = this.evaluate(key, this.mergeContext(options));
    return typeof value === "boolean" ? value : false;
  }

  async get<T>(key: string, options: FlagOptions<T>): Promise<T> {
    await this.initPromise;
    const value = this.evaluate(key, this.mergeContext(options));
    return value !== undefined && value !== null
      ? (value as T)
      : options.fallback;
  }

  private isEnabledSync(key: string, options?: IsEnabledOptions): boolean {
    const value = this.evaluate(key, this.mergeContext(options));
    return typeof value === "boolean" ? value : false;
  }

  private getSync<T>(key: string, options: FlagOptions<T>): T {
    const value = this.evaluate(key, this.mergeContext(options));
    return value !== undefined && value !== null
      ? (value as T)
      : options.fallback;
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
 * // With user context
 * gradual.identify({ userId: '123', plan: 'pro' })
 * const proFeature = await gradual.isEnabled('pro-feature')
 * ```
 */
export function createGradual(options: GradualOptions): Gradual {
  return new GradualClient(options);
}
