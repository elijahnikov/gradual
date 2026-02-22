import { createContext, type ReactNode, useContext, useRef } from "react";
import { create, useStore } from "zustand";

export type TimeframePreset = "24h" | "7d" | "30d" | "90d" | "custom";

interface DateRange {
  from: Date;
  to: Date;
}

interface MetricsState {
  flagId: string;
  organizationSlug: string;
  projectSlug: string;

  variationIds: string[];
  selectedVariationIds: Set<string>;

  timeframePreset: TimeframePreset;
  dateRange: DateRange;
}

interface MetricsActions {
  initialize: (config: {
    flagId: string;
    organizationSlug: string;
    projectSlug: string;
    variationIds: string[];
  }) => void;

  setTimeframePreset: (preset: TimeframePreset) => void;
  setCustomDateRange: (range: DateRange) => void;

  toggleVariation: (variationId: string) => void;
  selectAllVariations: () => void;
  deselectAllVariations: () => void;
}

type MetricsStore = MetricsState & MetricsActions;

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

const createMetricsStore = () =>
  create<MetricsStore>((set, get) => ({
    flagId: "",
    organizationSlug: "",
    projectSlug: "",
    variationIds: [],
    selectedVariationIds: new Set(),
    timeframePreset: "7d",
    dateRange: getDateRangeForPreset("7d"),

    initialize: (config) => {
      set({
        flagId: config.flagId,
        organizationSlug: config.organizationSlug,
        projectSlug: config.projectSlug,
        variationIds: config.variationIds,
        selectedVariationIds: new Set(config.variationIds),
      });
    },

    setTimeframePreset: (preset) => {
      const dateRange = getDateRangeForPreset(preset);
      set({
        timeframePreset: preset,
        dateRange,
      });
    },

    setCustomDateRange: (range) => {
      set({
        timeframePreset: "custom",
        dateRange: range,
      });
    },

    toggleVariation: (variationId) => {
      set((state) => {
        const newSelected = new Set(state.selectedVariationIds);
        if (newSelected.has(variationId)) {
          if (newSelected.size > 1) {
            newSelected.delete(variationId);
          }
        } else {
          newSelected.add(variationId);
        }
        return { selectedVariationIds: newSelected };
      });
    },

    selectAllVariations: () => {
      const { variationIds } = get();
      set({ selectedVariationIds: new Set(variationIds) });
    },

    deselectAllVariations: () => {
      const { variationIds } = get();
      const firstId = variationIds[0];
      set({ selectedVariationIds: new Set(firstId ? [firstId] : []) });
    },
  }));

type MetricsStoreApi = ReturnType<typeof createMetricsStore>;

const MetricsStoreContext = createContext<MetricsStoreApi | null>(null);

interface MetricsStoreProviderProps {
  children: ReactNode;
}

export function MetricsStoreProvider({ children }: MetricsStoreProviderProps) {
  const storeRef = useRef<MetricsStoreApi>(null);
  if (!storeRef.current) {
    storeRef.current = createMetricsStore();
  }
  return (
    <MetricsStoreContext.Provider value={storeRef.current}>
      {children}
    </MetricsStoreContext.Provider>
  );
}

export function useMetricsStore<T>(selector: (state: MetricsStore) => T): T {
  const store = useContext(MetricsStoreContext);
  if (!store) {
    throw new Error("useMetricsStore must be used within MetricsStoreProvider");
  }
  return useStore(store, selector);
}
