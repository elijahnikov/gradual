import {
  createGradual,
  type PollingOptions,
  type RealtimeOptions,
} from "@gradual-so/sdk";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { GradualContext } from "./context";

export interface GradualProviderProps {
  apiKey: string;
  environment: string;
  baseUrl?: string;
  polling?: PollingOptions;
  realtime?: RealtimeOptions;
  children: ReactNode;
}

export function GradualProvider({
  apiKey,
  environment,
  baseUrl,
  polling,
  realtime,
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

  const value = useMemo(
    () => ({ gradual, isReady, version }),
    [gradual, isReady, version]
  );

  return <GradualContext value={value}>{children}</GradualContext>;
}
