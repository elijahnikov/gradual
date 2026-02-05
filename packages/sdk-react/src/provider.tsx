import { createGradual, type PollingOptions } from "@gradual-so/sdk";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { GradualContext } from "./context";

export interface GradualProviderProps {
  apiKey: string;
  environment: string;
  baseUrl?: string;
  polling?: PollingOptions;
  children: ReactNode;
}

export function GradualProvider({
  apiKey,
  environment,
  baseUrl,
  polling,
  children,
}: GradualProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [version, setVersion] = useState(0);

  const gradual = useMemo(
    () => createGradual({ apiKey, environment, baseUrl, polling }),
    [apiKey, environment, baseUrl, polling]
  );

  useEffect(() => {
    let mounted = true;
    gradual.ready().then(() => {
      if (mounted) {
        setIsReady(true);
      }
    });

    // Subscribe to snapshot updates from polling
    const unsubscribe = gradual.onUpdate(() => {
      if (mounted) {
        setVersion((v) => v + 1);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [gradual]);

  const value = useMemo(
    () => ({ gradual, isReady, version }),
    [gradual, isReady, version]
  );

  return <GradualContext value={value}>{children}</GradualContext>;
}
