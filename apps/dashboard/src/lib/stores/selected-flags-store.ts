import { create } from "zustand";

interface SelectedFlagType {
  id: string;
  key: string;
  name: string;
}

interface SelectedFlagsStore {
  selectedFlags: SelectedFlagType[];
  setSelectedFlags: (selectedFlags: SelectedFlagType[]) => void;
  clearSelectedFlags: () => void;
}

export const useSelectedFlagsStore = create<SelectedFlagsStore>()((set) => ({
  selectedFlags: [],
  setSelectedFlags: (selectedFlags) => set({ selectedFlags }),
  clearSelectedFlags: () => set({ selectedFlags: [] }),
}));
