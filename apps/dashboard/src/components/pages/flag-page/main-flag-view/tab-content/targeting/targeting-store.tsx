import { createContext, type ReactNode, useContext, useRef } from "react";
import { create, useStore } from "zustand";
import type {
  Attribute,
  Context,
  ContextKind,
  RuleCondition,
  Segment,
  TargetType,
  Variation,
} from "./types";

export interface LocalRolloutVariation {
  variationId: string;
  weight: number;
}

export interface LocalRollout {
  variations: LocalRolloutVariation[];
  bucketContextKind: string;
  bucketAttributeKey: string;
  seed?: string;
}

export interface LocalTarget {
  id: string;
  type: TargetType;
  name: string;
  variationId?: string;
  rollout?: LocalRollout;
  conditions?: RuleCondition[];
  contextKind?: string;
  attributeKey?: string;
  attributeValue?: string;
  segmentId?: string;
}

interface TargetingState {
  attributes: Attribute[];
  contexts: Context[];
  segments: Segment[];
  variations: Variation[];
  organizationSlug: string;
  projectSlug: string;
  defaultVariationId: string;
  flagId: string;
  environmentSlug: string;

  attributesByKey: Map<string, Attribute>;
  attributesByContextKind: Map<ContextKind | "uncategorized", Attribute[]>;
  contextsById: Map<string, Context>;
  contextsByKind: Map<ContextKind, Context>;
  segmentsById: Map<string, Segment>;
  variationsById: Map<string, Variation>;

  targets: LocalTarget[];
  originalTargets: LocalTarget[];
  defaultVariationIdState: string;
  originalDefaultVariationId: string;
  defaultRollout: LocalRollout | null;
  originalDefaultRollout: LocalRollout | null;

  enabled: boolean;
  originalEnabled: boolean;
  offVariationId: string | null;
  originalOffVariationId: string | null;

  hasChanges: boolean;
  isReviewModalOpen: boolean;
}

interface TargetingActions {
  initialize: (config: {
    attributes: Attribute[];
    contexts: Context[];
    segments: Segment[];
    variations: Variation[];
    organizationSlug: string;
    projectSlug: string;
    defaultVariationId: string;
    defaultRollout?: LocalRollout | null;
    enabled?: boolean;
    offVariationId?: string | null;
    flagId: string;
    environmentSlug: string;
    existingTargets?: LocalTarget[];
  }) => void;

  markSaved: () => void;
  reset: () => void;

  addTarget: (type: TargetType, index: number) => void;
  deleteTarget: (id: string) => void;
  moveTarget: (id: string, direction: "up" | "down") => void;
  updateTargetVariation: (id: string, variationId: string) => void;
  updateTargetRollout: (id: string, rollout: LocalRollout) => void;
  setTargetMode: (id: string, mode: "single" | "rollout") => void;
  updateTargetConditions: (id: string, conditions: RuleCondition[]) => void;
  updateTargetIndividual: (
    id: string,
    contextKind: string | undefined,
    attributeKey: string,
    attributeValue: string
  ) => void;
  updateTargetSegment: (id: string, segmentId: string) => void;
  updateTargetName: (id: string, name: string) => void;
  setDefaultVariation: (variationId: string) => void;
  setDefaultRollout: (rollout: LocalRollout) => void;
  setDefaultMode: (mode: "single" | "rollout") => void;
  setEnabled: (enabled: boolean) => void;
  setOffVariationId: (offVariationId: string | null) => void;

  openReviewModal: () => void;
  closeReviewModal: () => void;
}

type TargetingStore = TargetingState & TargetingActions;

export const createTargetingStore = () =>
  create<TargetingStore>((set, get) => ({
    attributes: [],
    contexts: [],
    segments: [],
    variations: [],
    organizationSlug: "",
    projectSlug: "",
    defaultVariationId: "",
    flagId: "",
    environmentSlug: "",
    attributesByKey: new Map(),
    attributesByContextKind: new Map(),
    contextsById: new Map(),
    contextsByKind: new Map(),
    segmentsById: new Map(),
    variationsById: new Map(),
    targets: [],
    originalTargets: [],
    defaultVariationIdState: "",
    originalDefaultVariationId: "",
    defaultRollout: null,
    originalDefaultRollout: null,
    enabled: false,
    originalEnabled: false,
    offVariationId: null,
    originalOffVariationId: null,
    hasChanges: false,
    isReviewModalOpen: false,

    initialize: (config) => {
      const existingTargets = config.existingTargets ?? [];

      const attributesByContextKind = new Map<
        ContextKind | "uncategorized",
        Attribute[]
      >();
      const contextIdToKind = new Map<string, ContextKind>();

      for (const ctx of config.contexts) {
        contextIdToKind.set(ctx.id, ctx.kind as ContextKind);
        attributesByContextKind.set(ctx.kind as ContextKind, []);
      }
      attributesByContextKind.set("uncategorized", []);

      for (const attr of config.attributes) {
        const contextKind = attr.contextId
          ? (contextIdToKind.get(attr.contextId) ?? "uncategorized")
          : "uncategorized";
        const existing = attributesByContextKind.get(contextKind) ?? [];
        existing.push(attr);
        attributesByContextKind.set(contextKind, existing);
      }

      const defaultRollout = config.defaultRollout ?? null;

      // After first init, preserve enabled/offVariationId from the store
      // since they are managed by setEnabled/setOffVariationId/markSaved/reset.
      // Re-initializing them from the (possibly stale) query cache causes a flash.
      const current = get();
      const isFirstInit = !current.flagId;
      const enabled = isFirstInit ? (config.enabled ?? false) : current.enabled;
      const originalEnabled = isFirstInit
        ? (config.enabled ?? false)
        : current.originalEnabled;
      const offVariationId = isFirstInit
        ? (config.offVariationId ?? null)
        : current.offVariationId;
      const originalOffVariationId = isFirstInit
        ? (config.offVariationId ?? null)
        : current.originalOffVariationId;

      set({
        attributes: config.attributes,
        contexts: config.contexts,
        segments: config.segments,
        variations: config.variations,
        organizationSlug: config.organizationSlug,
        projectSlug: config.projectSlug,
        defaultVariationId: config.defaultVariationId,
        defaultVariationIdState: config.defaultVariationId,
        originalDefaultVariationId: config.defaultVariationId,
        defaultRollout,
        originalDefaultRollout: defaultRollout
          ? JSON.parse(JSON.stringify(defaultRollout))
          : null,
        enabled,
        originalEnabled,
        offVariationId,
        originalOffVariationId,
        flagId: config.flagId,
        environmentSlug: config.environmentSlug,
        attributesByKey: new Map(config.attributes.map((a) => [a.key, a])),
        attributesByContextKind,
        contextsById: new Map(config.contexts.map((c) => [c.id, c])),
        contextsByKind: new Map(
          config.contexts.map((c) => [c.kind as ContextKind, c])
        ),
        segmentsById: new Map(config.segments.map((s) => [s.id, s])),
        variationsById: new Map(config.variations.map((v) => [v.id, v])),
        targets: existingTargets,
        originalTargets: JSON.parse(JSON.stringify(existingTargets)),
        hasChanges: false,
      });
    },

    markSaved: () => {
      const {
        targets,
        defaultVariationIdState,
        defaultRollout,
        enabled,
        offVariationId,
      } = get();
      set({
        originalTargets: JSON.parse(JSON.stringify(targets)),
        originalDefaultVariationId: defaultVariationIdState,
        originalDefaultRollout: defaultRollout
          ? JSON.parse(JSON.stringify(defaultRollout))
          : null,
        originalEnabled: enabled,
        originalOffVariationId: offVariationId,
        hasChanges: false,
      });
    },

    reset: () => {
      const {
        originalTargets,
        originalDefaultVariationId,
        originalDefaultRollout,
        originalEnabled,
        originalOffVariationId,
      } = get();
      set({
        targets: JSON.parse(JSON.stringify(originalTargets)),
        defaultVariationIdState: originalDefaultVariationId,
        defaultRollout: originalDefaultRollout
          ? JSON.parse(JSON.stringify(originalDefaultRollout))
          : null,
        enabled: originalEnabled,
        offVariationId: originalOffVariationId,
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

    moveTarget: (id, direction) => {
      set((state) => {
        const index = state.targets.findIndex((t) => t.id === id);
        if (index === -1) {
          return state;
        }

        const newIndex = direction === "up" ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= state.targets.length) {
          return state;
        }

        const updated = [...state.targets];
        const removed = updated.splice(index, 1)[0];
        if (!removed) {
          return state;
        }
        updated.splice(newIndex, 0, removed);

        return { targets: updated, hasChanges: true };
      });
    },

    updateTargetVariation: (id, variationId) => {
      set((state) => ({
        targets: state.targets.map((t) =>
          t.id === id ? { ...t, variationId, rollout: undefined } : t
        ),
        hasChanges: true,
      }));
    },

    updateTargetRollout: (id, rollout) => {
      set((state) => ({
        targets: state.targets.map((t) =>
          t.id === id ? { ...t, rollout, variationId: undefined } : t
        ),
        hasChanges: true,
      }));
    },

    setTargetMode: (id, mode) => {
      const { variations, defaultVariationId } = get();
      if (mode === "single") {
        // Switch to single variation mode
        const firstVariation = variations[0];
        set((state) => ({
          targets: state.targets.map((t) =>
            t.id === id
              ? {
                  ...t,
                  variationId: firstVariation?.id ?? defaultVariationId,
                  rollout: undefined,
                }
              : t
          ),
          hasChanges: true,
        }));
      } else {
        // Switch to rollout mode - create default 50/50 split
        const v1 = variations[0];
        const v2 = variations[1] ?? variations[0];
        const rollout: LocalRollout = {
          variations:
            v1 && v2
              ? [
                  { variationId: v1.id, weight: 50_000 },
                  { variationId: v2.id, weight: 50_000 },
                ]
              : v1
                ? [{ variationId: v1.id, weight: 100_000 }]
                : [],
          bucketContextKind: "user",
          bucketAttributeKey: "id",
        };
        set((state) => ({
          targets: state.targets.map((t) =>
            t.id === id ? { ...t, rollout, variationId: undefined } : t
          ),
          hasChanges: true,
        }));
      }
    },

    updateTargetConditions: (id, conditions) => {
      set((state) => ({
        targets: state.targets.map((t) =>
          t.id === id ? { ...t, conditions } : t
        ),
        hasChanges: true,
      }));
    },

    updateTargetIndividual: (id, contextKind, attributeKey, attributeValue) => {
      set((state) => ({
        targets: state.targets.map((t) =>
          t.id === id ? { ...t, contextKind, attributeKey, attributeValue } : t
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
      set({
        defaultVariationIdState: variationId,
        defaultRollout: null,
        hasChanges: true,
      });
    },

    setDefaultRollout: (rollout) => {
      set({
        defaultRollout: rollout,
        defaultVariationIdState: "",
        hasChanges: true,
      });
    },

    setDefaultMode: (mode) => {
      const { variations, defaultVariationId } = get();
      if (mode === "single") {
        // Switch to single variation mode
        const firstVariation = variations[0];
        set({
          defaultVariationIdState: firstVariation?.id ?? defaultVariationId,
          defaultRollout: null,
          hasChanges: true,
        });
      } else {
        // Switch to rollout mode - create default 50/50 split
        const v1 = variations[0];
        const v2 = variations[1] ?? variations[0];
        const rollout: LocalRollout = {
          variations:
            v1 && v2
              ? [
                  { variationId: v1.id, weight: 50_000 },
                  { variationId: v2.id, weight: 50_000 },
                ]
              : v1
                ? [{ variationId: v1.id, weight: 100_000 }]
                : [],
          bucketContextKind: "user",
          bucketAttributeKey: "id",
        };
        set({
          defaultRollout: rollout,
          defaultVariationIdState: "",
          hasChanges: true,
        });
      }
    },

    setEnabled: (enabled) => {
      set({ enabled, hasChanges: true });
    },

    setOffVariationId: (offVariationId) => {
      set({ offVariationId, hasChanges: true });
    },

    openReviewModal: () => {
      set({ isReviewModalOpen: true });
    },

    closeReviewModal: () => {
      set({ isReviewModalOpen: false });
    },
  }));

export function getValidationErrors(
  targets: LocalTarget[]
): Map<string, string[]> {
  const errors = new Map<string, string[]>();

  for (const target of targets) {
    const targetErrors: string[] = [];

    if (!(target.variationId || target.rollout)) {
      targetErrors.push("A variation or rollout must be selected");
    }

    if (target.type === "rule") {
      if (!target.conditions || target.conditions.length === 0) {
        targetErrors.push("At least one condition is required");
      } else {
        for (const condition of target.conditions) {
          if (!condition.attributeKey?.trim()) {
            targetErrors.push("All conditions must have an attribute selected");
            break;
          }
          if (
            condition.operator !== "exists" &&
            condition.operator !== "not_exists"
          ) {
            const val = condition.value;
            if (
              val === undefined ||
              val === null ||
              String(val).trim() === ""
            ) {
              targetErrors.push("All condition values must be filled in");
              break;
            }
          }
        }
      }
    }

    if (target.type === "individual") {
      if (!(target.contextKind && target.attributeKey)) {
        targetErrors.push("Context and attribute must be selected");
      }
      if (!target.attributeValue?.trim()) {
        targetErrors.push("Attribute value is required");
      }
    }

    if (target.type === "segment" && !target.segmentId) {
      targetErrors.push("A segment must be selected");
    }

    if (targetErrors.length > 0) {
      errors.set(target.id, targetErrors);
    }
  }

  return errors;
}

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
