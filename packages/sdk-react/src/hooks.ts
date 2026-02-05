import type { EvaluationContext, Gradual } from "@gradual-so/sdk";
import { useContext, useMemo } from "react";
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: version triggers re-evaluation on snapshot update
  const value = useMemo(() => {
    if (!isReady) {
      return options.fallback;
    }
    return gradual.sync.get(key, {
      fallback: options.fallback,
      context: options.context,
    });
  }, [gradual, isReady, key, options.fallback, options.context, version]);

  if (options.detail) {
    return {
      value,
      isLoading: !isReady,
      isReady,
    };
  }

  return value;
}
