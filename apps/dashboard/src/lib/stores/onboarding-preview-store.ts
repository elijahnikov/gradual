import { create } from "zustand";

interface TeamMember {
  email: string;
  role: string;
}

interface OnboardingPreviewState {
  // Step 0 - Profile
  displayName: string;
  avatarPreviewUrl: string | undefined;
  jobRole: string | undefined;

  // Step 1 - Organization
  orgName: string;
  orgSlug: string;
  orgLogoPreviewUrl: string | undefined;
  teamMembers: TeamMember[];

  // Step 2 - SDK
  selectedPackageManager: string;

  // Step 3 - Plan
  selectedPlan: string | undefined;

  // Step action state (reported by each step for footer buttons)
  stepCanContinue: boolean;
  stepIsSubmitting: boolean;

  // Setters
  setDisplayName: (name: string) => void;
  setAvatarPreviewUrl: (url: string | undefined) => void;
  setJobRole: (role: string | undefined) => void;
  setOrgName: (name: string) => void;
  setOrgSlug: (slug: string) => void;
  setOrgLogoPreviewUrl: (url: string | undefined) => void;
  setTeamMembers: (members: TeamMember[]) => void;
  setSelectedPackageManager: (pm: string) => void;
  setSelectedPlan: (plan: string | undefined) => void;
  setStepCanContinue: (v: boolean) => void;
  setStepIsSubmitting: (v: boolean) => void;
  reset: () => void;
}

const initialState = {
  displayName: "",
  avatarPreviewUrl: undefined as string | undefined,
  jobRole: undefined as string | undefined,
  orgName: "",
  orgSlug: "",
  orgLogoPreviewUrl: undefined as string | undefined,
  teamMembers: [] as TeamMember[],
  selectedPackageManager: "npm",
  selectedPlan: undefined as string | undefined,
  stepCanContinue: true,
  stepIsSubmitting: false,
};

export const useOnboardingPreviewStore = create<OnboardingPreviewState>()(
  (set) => ({
    ...initialState,
    setDisplayName: (name) => set({ displayName: name }),
    setAvatarPreviewUrl: (url) => set({ avatarPreviewUrl: url }),
    setJobRole: (role) => set({ jobRole: role }),
    setOrgName: (name) => set({ orgName: name }),
    setOrgSlug: (slug) => set({ orgSlug: slug }),
    setOrgLogoPreviewUrl: (url) => set({ orgLogoPreviewUrl: url }),
    setTeamMembers: (members) => set({ teamMembers: members }),
    setSelectedPackageManager: (pm) => set({ selectedPackageManager: pm }),
    setSelectedPlan: (plan) => set({ selectedPlan: plan }),
    setStepCanContinue: (v) => set({ stepCanContinue: v }),
    setStepIsSubmitting: (v) => set({ stepIsSubmitting: v }),
    reset: () => set(initialState),
  })
);
