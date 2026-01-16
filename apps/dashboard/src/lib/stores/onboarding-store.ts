import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OnboardingStep = 0 | 1 | 2 | 3;

interface OnboardingState {
  currentStep: OnboardingStep;
  createdOrganizationId: string | undefined;
  createdProjectId: string | undefined;
  selectedPlanId: string | undefined;
  setCurrentStep: (step: OnboardingStep) => void;
  setCreatedOrganizationId: (id: string) => void;
  setCreatedProjectId: (id: string) => void;
  setSelectedPlanId: (id: string) => void;
  organizationSlug: string | undefined;
  setOrganizationSlug: (slug: string) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0 as OnboardingStep,
  createdOrganizationId: undefined as string | undefined,
  createdProjectId: undefined as string | undefined,
  selectedPlanId: undefined as string | undefined,
  organizationSlug: undefined as string | undefined,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      ...initialState,
      setCurrentStep: (step) => set({ currentStep: step }),
      setCreatedOrganizationId: (id) => set({ createdOrganizationId: id }),
      setCreatedProjectId: (id) => set({ createdProjectId: id }),
      setSelectedPlanId: (id) => set({ selectedPlanId: id }),
      setOrganizationSlug: (slug) => set({ organizationSlug: slug }),
      reset: () => set(initialState),
    }),
    {
      name: "onboarding-storage",
      version: 1,
    }
  )
);
