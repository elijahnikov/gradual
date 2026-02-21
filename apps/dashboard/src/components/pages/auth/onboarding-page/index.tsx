"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo } from "react";
import { useOnboardingPreviewStore } from "@/lib/stores/onboarding-preview-store";
import {
  type OnboardingStep,
  useOnboardingStore,
} from "@/lib/stores/onboarding-store";
import { useTRPC } from "@/lib/trpc";
import { CurrentStepHeader } from "./current-step-header";
import { DashboardPreview } from "./preview";
import { StepFooter } from "./step-breadcrumb";
import { CreateOrgStep } from "./steps/create-org-step";
import { GettingStartedStep } from "./steps/getting-started-step";
import { InstallSDKStep } from "./steps/install-sdk-step";
import { PlanSelectionStep } from "./steps/plan-selection-step";

export interface OnboardingStepEntry {
  step: OnboardingStep;
  title: string;
  description: string;
  component: React.ReactNode;
  skippable: boolean;
  formId?: string;
  onSkip: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

export default function OnboardingPageComponent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: session } = useSuspenseQuery(
    trpc.auth.getSession.queryOptions()
  );

  const { data: onboardingStatus } = useSuspenseQuery({
    ...trpc.auth.getUserOnboardingStatus.queryOptions(),
    gcTime: 0,
    staleTime: 0,
  });

  const {
    currentStep,
    setCurrentStep,
    setCreatedOrganizationId,
    setCreatedProjectId,
    setOrganizationSlug,
    organizationSlug,
    userId: storedUserId,
    setUserId,
    reset: resetOnboarding,
  } = useOnboardingStore();

  const resetPreview = useOnboardingPreviewStore((s) => s.reset);

  const { mutateAsync: updateUser, isPending: isUpdatingUser } = useMutation(
    trpc.auth.updateUser.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(trpc.auth.pathFilter());
      },
      onError: (error) => {
        console.error("Failed to update user:", error);
      },
    })
  );

  const handleStepComplete = useCallback(
    async (step: OnboardingStep, skipToNext = true) => {
      useOnboardingPreviewStore.getState().setStepIsSubmitting(true);
      useOnboardingPreviewStore.getState().setStepCanContinue(false);

      const nextStep = (step + 1) as OnboardingStep;

      if (step < 3) {
        await updateUser({
          onboardingStep: nextStep,
        });
      }
      if (skipToNext && step < 3) {
        setCurrentStep(nextStep);
      }

      await queryClient.invalidateQueries(
        trpc.auth.getUserOnboardingStatus.queryOptions()
      );
      await queryClient.invalidateQueries(trpc.auth.getSession.queryOptions());
    },
    [updateUser, setCurrentStep, queryClient, trpc]
  );

  const handleSkip = useCallback(
    (step: OnboardingStep) => {
      if (step < 3) {
        setCurrentStep((step + 1) as OnboardingStep);
      }
    },
    [setCurrentStep]
  );

  const handleFinish = useCallback(async () => {
    useOnboardingPreviewStore.getState().setStepIsSubmitting(true);
    useOnboardingPreviewStore.getState().setStepCanContinue(false);

    await updateUser({
      hasOnboarded: true,
    });
    resetPreview();

    if (organizationSlug) {
      navigate({
        to: "/$organizationSlug/$projectSlug",
        params: { organizationSlug, projectSlug: "default" },
      });
    } else {
      navigate({ to: "/" });
    }
  }, [updateUser, organizationSlug, navigate, resetPreview]);

  const steps: OnboardingStepEntry[] = useMemo(
    () => [
      {
        step: 0,
        title: "Getting started",
        description:
          "Add your details to your account; choose your username and upload a profile picture.",
        component: (
          <GettingStartedStep
            isLoading={isUpdatingUser}
            onComplete={() => handleStepComplete(0)}
          />
        ),
        skippable: true,
        formId: "onboarding-step-0",
        onSkip: () => handleSkip(0),
      },
      {
        step: 1,
        title: "Create your organization",
        description:
          "Set up your organization, create your first project and invite your teammates.",
        component: (
          <CreateOrgStep
            isLoading={isUpdatingUser}
            onComplete={(organizationId, projectId, orgSlug) => {
              setCreatedOrganizationId(organizationId);
              setCreatedProjectId(projectId);
              setOrganizationSlug(orgSlug);
              handleStepComplete(1);
            }}
          />
        ),
        skippable: false,
        formId: "onboarding-step-1",
        onSkip: () => handleSkip(1),
      },
      {
        step: 2,
        title: "Install SDK",
        description: "Get started with our SDK",
        component: <InstallSDKStep />,
        skippable: true,
        onSkip: () => handleSkip(2),
        onContinue: () => handleStepComplete(2),
      },
      {
        step: 3,
        title: "Choose Your Plan",
        description:
          "Choose the plan that best fits your needs. You can always upgrade or downgrade later.",
        component: <PlanSelectionStep isLoadingProp={isUpdatingUser} />,
        skippable: true,
        onSkip: handleFinish,
        onContinue: handleFinish,
        continueLabel: "Finish",
      },
    ],
    [
      handleSkip,
      handleFinish,
      handleStepComplete,
      isUpdatingUser,
      setCreatedOrganizationId,
      setCreatedProjectId,
      setOrganizationSlug,
    ]
  );

  // Reset onboarding state when a different user logs in
  useEffect(() => {
    const currentUserId = session?.user?.id;
    if (currentUserId && currentUserId !== storedUserId) {
      resetOnboarding();
      setUserId(currentUserId);
    }
  }, [session?.user?.id, storedUserId, resetOnboarding, setUserId]);

  useEffect(() => {
    if (onboardingStatus?.onboardingStep !== undefined) {
      const statusStep = onboardingStatus.onboardingStep as OnboardingStep;
      if (statusStep > currentStep || currentStep === 0) {
        setCurrentStep(statusStep);
      }
    }
  }, [onboardingStatus?.onboardingStep, currentStep, setCurrentStep]);

  const currentStepEntry = useMemo(
    () =>
      steps.find((step) => step.step === currentStep) as OnboardingStepEntry,
    [currentStep, steps]
  );

  return (
    <div className="flex h-screen w-screen">
      <div className="flex w-full flex-col bg-ui-bg-subtle lg:w-1/2">
        {currentStepEntry && (
          <CurrentStepHeader
            currentStep={currentStep}
            description={currentStepEntry.description}
            title={currentStepEntry.title}
          />
        )}

        <div className="flex flex-1 flex-col items-center justify-center px-8">
          <div className="flex w-full max-w-[640px] flex-col">
            {currentStepEntry && (
              <AnimatePresence mode="wait">
                <motion.div
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, x: 40, filter: "blur(4px)" }}
                  initial={{ opacity: 0, x: -40, filter: "blur(4px)" }}
                  key={currentStep}
                  transition={{
                    duration: 0.5,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="min-h-[400px]">
                    {currentStepEntry.component}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

        {currentStepEntry && (
          <StepFooter
            continueLabel={currentStepEntry.continueLabel}
            currentStep={currentStep}
            formId={currentStepEntry.formId}
            onContinue={currentStepEntry.onContinue}
            onSkip={currentStepEntry.onSkip}
            skippable={currentStepEntry.skippable}
            totalSteps={steps.length}
          />
        )}
      </div>

      <div className="relative hidden overflow-hidden border-l bg-ui-bg-base lg:flex lg:w-1/2">
        <div
          className="absolute inset-0 z-0 opacity-50 dark:hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          className="absolute inset-0 z-0 hidden opacity-50 dark:block"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="z-10 h-full w-full p-8">
          <DashboardPreview currentStep={currentStep} />
        </div>

        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-lg bg-linear-to-l from-ui-bg-base to-transparent" />
      </div>
    </div>
  );
}
