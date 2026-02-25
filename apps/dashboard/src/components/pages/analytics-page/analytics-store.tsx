import { createContext, type ReactNode, useContext, useRef } from "react";
import { create, useStore } from "zustand";

export type TimeframePreset = "24h" | "7d" | "30d" | "90d" | "custom";

interface DateRange {
  from: Date;
  to: Date;
}

interface AnalyticsState {
  organizationSlug: string;
  projectSlug: string;

  timeframePreset: TimeframePreset;
  dateRange: DateRange;

  selectedEnvironmentIds: string[];
  selectedFlagIds: string[];
}

interface AnalyticsActions {
  initialize: (config: {
    organizationSlug: string;
    projectSlug: string;
  }) => void;

  setTimeframePreset: (preset: TimeframePreset) => void;
  setCustomDateRange: (range: DateRange) => void;

  toggleEnvironment: (environmentId: string) => void;
  setEnvironments: (environmentIds: string[]) => void;

  toggleFlag: (flagId: string) => void;
  setFlags: (flagIds: string[]) => void;
}

type AnalyticsStore = AnalyticsState & AnalyticsActions;

const getDateRangeForPreset = (preset: TimeframePreset): DateRange => {
  const now = new Date();
  const to = new Date(now);
  to.setMinutes(0, 0, 0);

  const from = new Date(to);
  switch (preset) {
    case "24h":
      from.setHours(from.getHours() - 24);
      break;
    case "7d":
      from.setDate(from.getDate() - 7);
      break;
    case "30d":
      from.setDate(from.getDate() - 30);
      break;
    case "90d":
      from.setDate(from.getDate() - 90);
      break;
    default:
      from.setDate(from.getDate() - 7);
      break;
  }

  return { from, to };
};

const createAnalyticsStore = (initialConfig: {
  organizationSlug: string;
  projectSlug: string;
}) =>
  create<AnalyticsStore>((set) => ({
    organizationSlug: initialConfig.organizationSlug,
    projectSlug: initialConfig.projectSlug,
    timeframePreset: "7d",
    dateRange: getDateRangeForPreset("7d"),
    selectedEnvironmentIds: [],
    selectedFlagIds: [],

    initialize: (config) => {
      set({
        organizationSlug: config.organizationSlug,
        projectSlug: config.projectSlug,
      });
    },

    setTimeframePreset: (preset) => {
      const dateRange = getDateRangeForPreset(preset);
      set({ timeframePreset: preset, dateRange });
    },

    setCustomDateRange: (range) => {
      set({ timeframePreset: "custom", dateRange: range });
    },

    toggleEnvironment: (environmentId) => {
      set((state) => {
        const ids = state.selectedEnvironmentIds.includes(environmentId)
          ? state.selectedEnvironmentIds.filter((id) => id !== environmentId)
          : [...state.selectedEnvironmentIds, environmentId];
        return { selectedEnvironmentIds: ids };
      });
    },

    setEnvironments: (environmentIds) => {
      set({ selectedEnvironmentIds: environmentIds });
    },

    toggleFlag: (flagId) => {
      set((state) => {
        const ids = state.selectedFlagIds.includes(flagId)
          ? state.selectedFlagIds.filter((id) => id !== flagId)
          : [...state.selectedFlagIds, flagId];
        return { selectedFlagIds: ids };
      });
    },

    setFlags: (flagIds) => {
      set({ selectedFlagIds: flagIds });
    },
  }));

type AnalyticsStoreApi = ReturnType<typeof createAnalyticsStore>;

const AnalyticsStoreContext = createContext<AnalyticsStoreApi | null>(null);

interface AnalyticsStoreProviderProps {
  organizationSlug: string;
  projectSlug: string;
  children: ReactNode;
}

export function AnalyticsStoreProvider({
  organizationSlug,
  projectSlug,
  children,
}: AnalyticsStoreProviderProps) {
  const storeRef = useRef<AnalyticsStoreApi>(null);
  if (!storeRef.current) {
    storeRef.current = createAnalyticsStore({ organizationSlug, projectSlug });
  }
  return (
    <AnalyticsStoreContext.Provider value={storeRef.current}>
      {children}
    </AnalyticsStoreContext.Provider>
  );
}

export function useAnalyticsStore<T>(
  selector: (state: AnalyticsStore) => T
): T {
  const store = useContext(AnalyticsStoreContext);
  if (!store) {
    throw new Error(
      "useAnalyticsStore must be used within AnalyticsStoreProvider"
    );
  }
  return useStore(store, selector);
}
