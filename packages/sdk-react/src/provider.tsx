import { createGradual, type GradualOptions } from "@gradual-so/sdk";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { GradualContext } from "./context";

export interface GradualProviderProps extends GradualOptions {
  children: ReactNode;
}

export function GradualProvider({
  apiKey,
  environment,
  baseUrl,
  children,
}: GradualProviderProps) {
  const [isReady, setIsReady] = useState(false);

  const gradual = useMemo(
    () => createGradual({ apiKey, environment, baseUrl }),
    [apiKey, environment, baseUrl]
  );

  useEffect(() => {
    let mounted = true;
    gradual.ready().then(() => {
      if (mounted) {
        setIsReady(true);
      }
    });
    return () => {
      mounted = false;
    };
  }, [gradual]);

  const value = useMemo(() => ({ gradual, isReady }), [gradual, isReady]);

  return <GradualContext value={value}>{children}</GradualContext>;
}
