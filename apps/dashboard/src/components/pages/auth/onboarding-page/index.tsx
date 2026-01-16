"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import {
  type OnboardingStep,
  useOnboardingStore,
} from "@/lib/stores/onboarding-store";
import { useTRPC } from "@/lib/trpc";
import { CurrentStepHeader } from "./current-step-header";
import { PageHeader } from "./page-header";
import { StepBreadcrumb } from "./step-breadcrumb";
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
}

export default function OnboardingPageComponent() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: onboardingStatus } = useSuspenseQuery({
    ...trpc.auth.getUserOnboardingStatus.queryOptions(),
    gcTime: 0,
    staleTime: 0,
  });
  const { data: session } = useSuspenseQuery({
    ...trpc.auth.getSession.queryOptions(),
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
  } = useOnboardingStore();

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
      const nextStep = (step + 1) as OnboardingStep;

      if (skipToNext && step < 3) {
        setCurrentStep(nextStep);
      }

      if (step < 3) {
        updateUser({
          onboardingStep: nextStep,
        });
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
    await updateUser({
      hasOnboarded: true,
    });

    if (organizationSlug) {
      navigate({
        to: "/$organizationSlug",
        params: { organizationSlug },
      });
    } else {
      navigate({ to: "/" });
    }
  }, [updateUser, organizationSlug, navigate]);

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
            onSkip={() => handleSkip(0)}
          />
        ),
        skippable: true,
      },
      {
        step: 1,
        title: "Create your organization",
        description:
          "Set up your organization, create your first project invite your teammates.",
        component: (
          <CreateOrgStep
            isLoading={isUpdatingUser}
            onComplete={(organizationId, projectId, organizationSlug) => {
              setCreatedOrganizationId(organizationId);
              setCreatedProjectId(projectId);
              setOrganizationSlug(organizationSlug);
              handleStepComplete(1);
            }}
          />
        ),
        skippable: false,
      },
      {
        step: 2,
        title: "Install SDK",
        description: "Get started with our SDK",
        component: (
          <InstallSDKStep
            isLoading={isUpdatingUser}
            onComplete={() => handleStepComplete(2)}
            onSkip={() => handleSkip(2)}
          />
        ),
        skippable: true,
      },
      {
        step: 3,
        title: "Choose Your Plan",
        description:
          "Choose the plan that best fits your needs. You can always upgrade or downgrade later.",
        component: (
          <PlanSelectionStep
            isLoadingProp={isUpdatingUser}
            onComplete={handleFinish}
            onSkip={handleFinish}
          />
        ),
        skippable: true,
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
    <div className="flex min-h-screen min-w-screen items-center justify-center bg-ui-bg-subtle">
      <PageHeader
        email={session?.user?.email}
        image={session?.user?.image ?? undefined}
      />
      <div className="flex flex-col">
        <div className="">
          {currentStepEntry && (
            <div className="flex h-full min-w-[400px] flex-col gap-8">
              <CurrentStepHeader
                description={currentStepEntry.description}
                title={currentStepEntry.title}
              />
              <div className="h-[70vh] max-h-[70vh]">
                {currentStepEntry.component}
              </div>
            </div>
          )}
        </div>
        <StepBreadcrumb currentStep={currentStep} totalSteps={steps.length} />
      </div>
    </div>
  );
}
