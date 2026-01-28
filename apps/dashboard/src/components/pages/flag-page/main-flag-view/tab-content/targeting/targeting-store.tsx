import { createContext, type ReactNode, useContext, useRef } from "react";
import { create, useStore } from "zustand";
import type {
  Attribute,
  RuleCondition,
  Segment,
  TargetType,
  Variation,
} from "./types";

export interface LocalTarget {
  id: string;
  type: TargetType;
  name: string;
  variationId: string;
  conditions?: RuleCondition[];
  attributeKey?: string;
  attributeValue?: string;
  segmentId?: string;
}

interface TargetingState {
  attributes: Attribute[];
  segments: Segment[];
  variations: Variation[];
  organizationSlug: string;
  projectSlug: string;
  defaultVariationId: string;

  attributesByKey: Map<string, Attribute>;
  segmentsById: Map<string, Segment>;
  variationsById: Map<string, Variation>;

  targets: LocalTarget[];
  defaultVariationIdState: string;

  // Change tracking
  hasChanges: boolean;

  // Modal state
  isReviewModalOpen: boolean;
}

interface TargetingActions {
  initialize: (config: {
    attributes: Attribute[];
    segments: Segment[];
    variations: Variation[];
    organizationSlug: string;
    projectSlug: string;
    defaultVariationId: string;
  }) => void;

  addTarget: (type: TargetType, index: number) => void;
  deleteTarget: (id: string) => void;
  updateTargetVariation: (id: string, variationId: string) => void;
  updateTargetConditions: (id: string, conditions: RuleCondition[]) => void;
  updateTargetIndividual: (
    id: string,
    attributeKey: string,
    attributeValue: string
  ) => void;
  updateTargetSegment: (id: string, segmentId: string) => void;
  updateTargetName: (id: string, name: string) => void;
  setDefaultVariation: (variationId: string) => void;

  // Modal actions
  openReviewModal: () => void;
  closeReviewModal: () => void;
}

type TargetingStore = TargetingState & TargetingActions;

export const createTargetingStore = () =>
  create<TargetingStore>((set, get) => ({
    attributes: [],
    segments: [],
    variations: [],
    organizationSlug: "",
    projectSlug: "",
    defaultVariationId: "",
    attributesByKey: new Map(),
    segmentsById: new Map(),
    variationsById: new Map(),
    targets: [],
    defaultVariationIdState: "",
    hasChanges: false,
    isReviewModalOpen: false,

    initialize: (config) => {
      set({
        attributes: config.attributes,
        segments: config.segments,
        variations: config.variations,
        organizationSlug: config.organizationSlug,
        projectSlug: config.projectSlug,
        defaultVariationId: config.defaultVariationId,
        defaultVariationIdState: config.defaultVariationId,
        attributesByKey: new Map(config.attributes.map((a) => [a.key, a])),
        segmentsById: new Map(config.segments.map((s) => [s.id, s])),
        variationsById: new Map(config.variations.map((v) => [v.id, v])),
        // Reset changes on initialize
        hasChanges: false,
      });
    },

    addTarget: (type, index) => {
      const { defaultVariationId } = get();
      const newTarget: LocalTarget = {
        id: crypto.randomUUID(),
        type,
        name: `${type}`,
        variationId: defaultVariationId,
      };
      set((state) => {
        const updated = [...state.targets];
        updated.splice(index, 0, newTarget);
        return { targets: updated, hasChanges: true };
      });
    },

    deleteTarget: (id) => {
      set((state) => ({
        targets: state.targets.filter((t) => t.id !== id),
        hasChanges: true,
      }));
    },

    updateTargetVariation: (id, variationId) => {
      set((state) => ({
        targets: state.targets.map((t) =>
          t.id === id ? { ...t, variationId } : t
        ),
        hasChanges: true,
      }));
    },

    updateTargetConditions: (id, conditions) => {
      set((state) => ({
        targets: state.targets.map((t) =>
          t.id === id ? { ...t, conditions } : t
        ),
        hasChanges: true,
      }));
    },

    updateTargetIndividual: (id, attributeKey, attributeValue) => {
      set((state) => ({
        targets: state.targets.map((t) =>
          t.id === id ? { ...t, attributeKey, attributeValue } : t
        ),
        hasChanges: true,
      }));
    },

    updateTargetSegment: (id, segmentId) => {
      set((state) => ({
        targets: state.targets.map((t) =>
          t.id === id ? { ...t, segmentId } : t
        ),
        hasChanges: true,
      }));
    },

    updateTargetName: (id, name) => {
      set((state) => ({
        targets: state.targets.map((t) => (t.id === id ? { ...t, name } : t)),
        hasChanges: true,
      }));
    },

    setDefaultVariation: (variationId) => {
      set({ defaultVariationIdState: variationId, hasChanges: true });
    },

    openReviewModal: () => {
      set({ isReviewModalOpen: true });
    },

    closeReviewModal: () => {
      set({ isReviewModalOpen: false });
    },
  }));

type TargetingStoreApi = ReturnType<typeof createTargetingStore>;

const TargetingStoreContext = createContext<TargetingStoreApi | null>(null);

interface TargetingStoreProviderProps {
  children: ReactNode;
}

export function TargetingStoreProvider({
  children,
}: TargetingStoreProviderProps) {
  const storeRef = useRef<TargetingStoreApi>(null);
  if (!storeRef.current) {
    storeRef.current = createTargetingStore();
  }
  return (
    <TargetingStoreContext.Provider value={storeRef.current}>
      {children}
    </TargetingStoreContext.Provider>
  );
}

export function useTargetingStore<T>(
  selector: (state: TargetingStore) => T
): T {
  const store = useContext(TargetingStoreContext);
  if (!store) {
    throw new Error(
      "useTargetingStore must be used within TargetingStoreProvider"
    );
  }
  return useStore(store, selector);
}
