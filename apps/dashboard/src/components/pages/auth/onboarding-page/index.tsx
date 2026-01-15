"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { CurrentStepHeader } from "./current-step-header";
import PageHeader from "./page-header";
import Breadcrumb from "./step-breadcrumb";
import { CreateOrgStep } from "./steps/create-org-step";
import { GettingStartedStep } from "./steps/getting-started-step";
import { InstallSDKStep } from "./steps/install-sdk-step";
import { PlanSelectionStep } from "./steps/plan-selection-step";

type OnboardingStep = 0 | 1 | 2 | 3;
export interface OnboardingStepEntry {
  step: OnboardingStep;
  title: string;
  description: string;
  component: React.ReactNode;
  skippable: boolean;
}

export default function OnboardingPageComponent() {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: onboardingStatus } = useSuspenseQuery(
    trpc.auth.getUserOnboardingStatus.queryOptions()
  );
  const { data: session } = useSuspenseQuery(
    trpc.auth.getSession.queryOptions()
  );
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(
    (onboardingStatus?.onboardingStep as OnboardingStep) ?? 0
  );

  const onboardingStatusQueryKey =
    trpc.auth.getUserOnboardingStatus.queryOptions().queryKey;

  const { mutate: updateUser, isPending: isUpdatingUser } = useMutation(
    trpc.auth.updateUser.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: onboardingStatusQueryKey });
      },
      onError: (error) => {
        console.error("Failed to update user:", error);
      },
    })
  );

  const handleStepComplete = useCallback(
    (step: OnboardingStep, skipToNext = true) => {
      const nextStep = (step + 1) as OnboardingStep;

      if (skipToNext && step < 3) {
        setCurrentStep(nextStep);
      }

      updateUser({
        onboardingStep: nextStep,
      });
    },
    [updateUser]
  );

  const handleSkip = useCallback((step: OnboardingStep) => {
    if (step < 3) {
      setCurrentStep((step + 1) as OnboardingStep);
    }
  }, []);

  const handleFinish = useCallback(() => {
    updateUser({
      hasOnboarded: true,
    });

    router.navigate({ to: "/" });
  }, [updateUser, router]);

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
            onComplete={() => handleStepComplete(1)}
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
        description: "Select the plan that works for you",
        component: (
          <PlanSelectionStep
            isLoadingProp={isUpdatingUser}
            onComplete={() => handleStepComplete(3, false)}
            onSkip={() => handleFinish()}
          />
        ),
        skippable: true,
      },
    ],
    [handleSkip, handleFinish, handleStepComplete, isUpdatingUser]
  );

  // Only sync on initial load, not on every update
  // Only sync from query if it's ahead of current step (e.g., on initial load or if user navigated back)
  useEffect(() => {
    if (onboardingStatus?.onboardingStep !== undefined) {
      const statusStep = onboardingStatus.onboardingStep as OnboardingStep;
      // Only update if the status step is ahead of current step, or if currentStep is 0 (initial load)
      if (statusStep > currentStep || currentStep === 0) {
        setCurrentStep(statusStep);
      }
    }
  }, [onboardingStatus?.onboardingStep, currentStep]);

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
            <div className="relative flex h-full min-w-[400px] flex-col gap-8">
              <CurrentStepHeader currentStep={currentStepEntry} />
              <div className="h-[60vh] max-h-[60vh]">
                {currentStepEntry.component}
              </div>
            </div>
          )}
        </div>
        <Breadcrumb currentStepIndex={currentStep} steps={steps.length} />
      </div>
    </div>
  );
}
