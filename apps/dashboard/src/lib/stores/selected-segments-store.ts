import { create } from "zustand";

interface SelectedSegmentType {
  id: string;
  key: string;
  name: string;
}

interface SelectedSegmentsStore {
  selectedSegments: SelectedSegmentType[];
  setSelectedSegments: (selectedSegments: SelectedSegmentType[]) => void;
  clearSelectedSegments: () => void;
}

export const useSelectedSegmentsStore = create<SelectedSegmentsStore>()(
  (set) => ({
    selectedSegments: [],
    setSelectedSegments: (selectedSegments) => set({ selectedSegments }),
    clearSelectedSegments: () => set({ selectedSegments: [] }),
  })
);
