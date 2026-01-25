import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChartEnvironmentsStore {
  selectedEnvironmentsByProject: Record<string, string[]>;
  getSelectedEnvironments: (projectId: string) => string[];
  setSelectedEnvironments: (
    projectId: string,
    environmentIds: string[]
  ) => void;
  toggleEnvironment: (projectId: string, environmentId: string) => void;
}

const MAX_SELECTED_ENVIRONMENTS = 3;

export const useChartEnvironmentsStore = create<ChartEnvironmentsStore>()(
  persist(
    (set, get) => ({
      selectedEnvironmentsByProject: {},

      getSelectedEnvironments: (projectId: string) => {
        return get().selectedEnvironmentsByProject[projectId] ?? [];
      },

      setSelectedEnvironments: (
        projectId: string,
        environmentIds: string[]
      ) => {
        set((state) => ({
          selectedEnvironmentsByProject: {
            ...state.selectedEnvironmentsByProject,
            [projectId]: environmentIds.slice(0, MAX_SELECTED_ENVIRONMENTS),
          },
        }));
      },

      toggleEnvironment: (projectId: string, environmentId: string) => {
        set((state) => {
          const current = state.selectedEnvironmentsByProject[projectId] ?? [];
          const isSelected = current.includes(environmentId);

          let newSelection: string[];
          if (isSelected) {
            // Don't allow deselecting if only one is selected
            if (current.length <= 1) {
              return state;
            }
            newSelection = current.filter((id) => id !== environmentId);
          } else {
            // If at max, replace the oldest selection
            if (current.length >= MAX_SELECTED_ENVIRONMENTS) {
              newSelection = [...current.slice(1), environmentId];
            } else {
              newSelection = [...current, environmentId];
            }
          }

          return {
            selectedEnvironmentsByProject: {
              ...state.selectedEnvironmentsByProject,
              [projectId]: newSelection,
            },
          };
        });
      },
    }),
    {
      name: "chart-environments-storage",
    }
  )
);
