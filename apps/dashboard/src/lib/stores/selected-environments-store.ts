import { create } from "zustand";

interface SelectedEnvironmentType {
  id: string;
  slug: string;
  name: string;
}

interface SelectedEnvironmentsStore {
  selectedEnvironments: SelectedEnvironmentType[];
  setSelectedEnvironments: (
    selectedEnvironments: SelectedEnvironmentType[]
  ) => void;
  clearSelectedEnvironments: () => void;
}

export const useSelectedEnvironmentsStore = create<SelectedEnvironmentsStore>()(
  (set) => ({
    selectedEnvironments: [],
    setSelectedEnvironments: (selectedEnvironments) =>
      set({ selectedEnvironments }),
    clearSelectedEnvironments: () => set({ selectedEnvironments: [] }),
  })
);
