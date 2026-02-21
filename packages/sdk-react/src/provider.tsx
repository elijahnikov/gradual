import {
  createGradual,
  type EvaluationContext,
  type PollingOptions,
  type RealtimeOptions,
} from "@gradual-so/sdk";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { GradualContext } from "./context";

export interface GradualProviderProps {
  apiKey: string;
  environment: string;
  baseUrl?: string;
  polling?: PollingOptions;
  realtime?: RealtimeOptions;
  /** Identify the current user for flag evaluation and MAU tracking. Pass null/undefined to reset. */
  identity?: EvaluationContext | null;
  children: ReactNode;
}

export function GradualProvider({
  apiKey,
  environment,
  baseUrl,
  polling,
  realtime,
  identity,
  children,
}: GradualProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [version, setVersion] = useState(0);

  const gradual = useMemo(
    () => createGradual({ apiKey, environment, baseUrl, polling, realtime }),
    [apiKey, environment, baseUrl, polling, realtime]
  );

  useEffect(() => {
    let mounted = true;
    gradual.ready().then(() => {
      if (mounted) {
        setIsReady(true);
      }
    });

    const unsubscribe = gradual.onUpdate(() => {
      if (mounted) {
        setVersion((v) => v + 1);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      gradual.close();
    };
  }, [gradual]);

  // Identify/reset when user prop changes
  const prevIdentityRef = useRef<string | null>(null);
  useEffect(() => {
    const serialized = identity ? JSON.stringify(identity) : null;
    if (serialized === prevIdentityRef.current) {
      return;
    }
    prevIdentityRef.current = serialized;

    if (identity) {
      gradual.identify(identity);
    } else {
      gradual.reset();
    }
  }, [identity, gradual]);

  const value = useMemo(
    () => ({ gradual, isReady, version }),
    [gradual, isReady, version]
  );

  return <GradualContext value={value}>{children}</GradualContext>;
}
