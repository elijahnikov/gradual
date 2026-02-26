import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  type LiveEvaluation,
  useLiveEvaluationListener,
} from "@/hooks/use-live-evaluations";
import { isDateRangeLive, useAnalyticsStore } from "./analytics-store";

interface AnalyticsLiveState {
  totalEvaluations: number;
  errorCount: number;
  flagCounts: Map<string, number>;
  platformCounts: Map<string, number>;
  volumePoints: { time: number; value: number }[];
  latencyValues: number[];
  isLive: boolean;
}

const AnalyticsLiveContext = createContext<AnalyticsLiveState | null>(null);

function useAnalyticsLiveUpdates(): AnalyticsLiveState {
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const preset = useAnalyticsStore((s) => s.timeframePreset);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);
  const isLive = isDateRangeLive(preset, dateRange);

  const [state, setState] = useState({
    totalEvaluations: 0,
    errorCount: 0,
    flagCounts: new Map<string, number>(),
    platformCounts: new Map<string, number>(),
    volumePoints: [] as { time: number; value: number }[],
    latencyValues: [] as number[],
  });

  const prevKeyRef = useRef("");
  const key = `${preset}-${dateRange.from.getTime()}-${environmentIds.join(",")}-${flagIds.join(",")}`;
  if (key !== prevKeyRef.current) {
    prevKeyRef.current = key;
    if (state.totalEvaluations > 0) {
      setState({
        totalEvaluations: 0,
        errorCount: 0,
        flagCounts: new Map(),
        platformCounts: new Map(),
        volumePoints: [],
        latencyValues: [],
      });
    }
  }

  useLiveEvaluationListener(
    useCallback(
      (event: LiveEvaluation) => {
        if (!isLive) {
          return;
        }

        if (
          environmentIds.length > 0 &&
          !environmentIds.includes(event.environmentId)
        ) {
          return;
        }
        if (flagIds.length > 0 && !flagIds.includes(event.featureFlagId)) {
          return;
        }

        setState((prev) => {
          const fc = new Map(prev.flagCounts);
          fc.set(event.featureFlagId, (fc.get(event.featureFlagId) ?? 0) + 1);

          const pc = new Map(prev.platformCounts);
          const platform = event.sdkPlatform ?? "unknown";
          pc.set(platform, (pc.get(platform) ?? 0) + 1);

          return {
            totalEvaluations: prev.totalEvaluations + 1,
            errorCount: prev.errorCount + (event.errorDetail ? 1 : 0),
            flagCounts: fc,
            platformCounts: pc,
            volumePoints: [
              ...prev.volumePoints,
              {
                time: Date.now() / 1000,
                value: prev.totalEvaluations + 1,
              },
            ],
            latencyValues:
              event.evaluationDurationUs != null
                ? [...prev.latencyValues, event.evaluationDurationUs]
                : prev.latencyValues,
          };
        });
      },
      [isLive, environmentIds, flagIds]
    )
  );

  return { ...state, isLive };
}

export function AnalyticsLiveProvider({ children }: { children: ReactNode }) {
  const liveState = useAnalyticsLiveUpdates();
  return (
    <AnalyticsLiveContext.Provider value={liveState}>
      {children}
    </AnalyticsLiveContext.Provider>
  );
}

export function useAnalyticsLive(): AnalyticsLiveState {
  const ctx = useContext(AnalyticsLiveContext);
  if (!ctx) {
    throw new Error(
      "useAnalyticsLive must be used within AnalyticsLiveProvider"
    );
  }
  return ctx;
}
