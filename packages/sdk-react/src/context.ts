import type { Gradual } from "@gradual-so/sdk";
import { createContext } from "react";

export interface GradualContextValue {
  gradual: Gradual | null;
  isReady: boolean;
}

export const GradualContext = createContext<GradualContextValue>({
  gradual: null,
  isReady: false,
});
