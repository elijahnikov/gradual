import type {
  EvaluationContext,
  EvaluationResult,
  Gradual,
} from "@gradual-so/sdk";
import { useContext, useEffect, useMemo, useRef } from "react";
import { GradualContext } from "./context";

export interface UseFlagOptions<T> {
  fallback: T;
  context?: EvaluationContext;
  detail?: boolean;
}

export interface FlagDetail<T> {
  value: T;
  isLoading: boolean;
  isReady: boolean;
}

function useGradualContext(): {
  gradual: Gradual;
  isReady: boolean;
  version: number;
} {
  const context = useContext(GradualContext);
  if (!context.gradual) {
    throw new Error("useFlag must be used within a <GradualProvider>");
  }
  return {
    gradual: context.gradual,
    isReady: context.isReady,
    version: context.version,
  };
}

/**
 * Access the Gradual client for identity management
 *
 * @example
 * ```tsx
 * const { identify, reset, isReady } = useGradual()
 *
 * useEffect(() => {
 *   if (user) {
 *     identify({ userId: user.id, plan: user.plan })
 *   } else {
 *     reset()
 *   }
 * }, [user])
 * ```
 */
export function useGradual(): {
  identify: (context: EvaluationContext) => void;
  reset: () => void;
  isReady: boolean;
  refresh: () => Promise<void>;
} {
  const { gradual, isReady } = useGradualContext();

  return useMemo(
    () => ({
      identify: (ctx: EvaluationContext) => gradual.identify(ctx),
      reset: () => gradual.reset(),
      refresh: () => gradual.refresh(),
      isReady,
    }),
    [gradual, isReady]
  );
}

/**
 * Get a feature flag value with type inference
 *
 * @example
 * ```tsx
 * // Simple usage - returns value directly
 * const showBanner = useFlag('show-banner', { fallback: false })
 * const theme = useFlag('theme', { fallback: 'light' })
 *
 * // With loading state
 * const { value, isLoading } = useFlag('experiment', {
 *   fallback: 'control',
 *   detail: true
 * })
 *
 * // With context override
 * const enabled = useFlag('feature', {
 *   fallback: false,
 *   context: { itemId: item.id }
 * })
 * ```
 */
export function useFlag<T>(
  key: string,
  options: UseFlagOptions<T> & { detail: true }
): FlagDetail<T>;
export function useFlag<T>(
  key: string,
  options: UseFlagOptions<T> & { detail?: false }
): T;
export function useFlag<T>(
  key: string,
  options: UseFlagOptions<T>
): T | FlagDetail<T>;
export function useFlag<T>(
  key: string,
  options: UseFlagOptions<T>
): T | FlagDetail<T> {
  const { gradual, isReady, version } = useGradualContext();
  const trackedRef = useRef<string | null>(null);

  // Pure evaluation in useMemo — no side effects
  // biome-ignore lint/correctness/useExhaustiveDependencies: version triggers re-evaluation on snapshot update
  const evalResult = useMemo((): EvaluationResult | null => {
    if (!isReady) {
      return null;
    }
    return gradual.sync.evaluate(key, { context: options.context });
  }, [gradual, isReady, key, options.context, version]);

  const value =
    evalResult?.value !== undefined && evalResult?.value !== null
      ? (evalResult.value as T)
      : options.fallback;

  // Track evaluation as a side effect — runs once per distinct evaluation
  // biome-ignore lint/correctness/useExhaustiveDependencies: only track when evalResult changes
  useEffect(() => {
    if (!evalResult) {
      return;
    }

    const trackKey = `${key}:${evalResult.variationKey}:${evalResult.reasons.map((r) => r.type).join(",")}`;
    if (trackedRef.current === trackKey) {
      return;
    }
    trackedRef.current = trackKey;

    gradual.sync.track(key, evalResult, options.context);
  }, [gradual, key, evalResult]);

  if (options.detail) {
    return {
      value,
      isLoading: !isReady,
      isReady,
    };
  }

  return value;
}
