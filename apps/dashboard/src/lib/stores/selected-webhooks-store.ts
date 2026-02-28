import { create } from "zustand";

interface SelectedWebhookType {
  id: string;
  name: string;
}

interface SelectedWebhooksStore {
  selectedWebhooks: SelectedWebhookType[];
  setSelectedWebhooks: (selectedWebhooks: SelectedWebhookType[]) => void;
  clearSelectedWebhooks: () => void;
}

export const useSelectedWebhooksStore = create<SelectedWebhooksStore>()(
  (set) => ({
    selectedWebhooks: [],
    setSelectedWebhooks: (selectedWebhooks) => set({ selectedWebhooks }),
    clearSelectedWebhooks: () => set({ selectedWebhooks: [] }),
  })
);
