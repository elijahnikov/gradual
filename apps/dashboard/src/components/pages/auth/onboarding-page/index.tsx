"use client";

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/auth/client";
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

  const { data: session } = useSuspenseQuery(
    trpc.auth.getSession.queryOptions()
  );
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(0);

  const handleStepComplete = (step: OnboardingStep, skipToNext = true) => {
    if (session?.user) {
      const sessionQueryKey = trpc.auth.getSession.queryOptions().queryKey;

      queryClient.setQueryData(sessionQueryKey, (oldData) => {
        if (!oldData?.user) {
          return oldData;
        }
        return {
          ...oldData,
          user: {
            ...oldData.user,
            onboardingStep: step,
          },
        };
      });

      authClient
        .updateUser({
          onboardingStep: step,
        } as Record<string, unknown>)
        .then(() => {
          queryClient.invalidateQueries({
            queryKey: sessionQueryKey,
          });
        })
        .catch((error) => {
          console.error("Failed to update onboarding step:", error);
          queryClient.setQueryData(sessionQueryKey, session);
        });
    }

    if (skipToNext && step < 3) {
      setCurrentStep((step + 1) as OnboardingStep);
    }
  };

  const handleSkip = (step: OnboardingStep) => {
    if (step < 3) {
      setCurrentStep((step + 1) as OnboardingStep);
    }
  };

  const handleFinish = () => {
    if (session?.user) {
      const sessionQueryKey = trpc.auth.getSession.queryOptions().queryKey;

      queryClient.setQueryData(sessionQueryKey, (oldData) => {
        if (!oldData?.user) {
          return oldData;
        }
        return {
          ...oldData,
          user: {
            ...oldData.user,
            hasOnboarded: true,
          },
        };
      });

      authClient
        .updateUser({
          hasOnboarded: true,
        } as Record<string, unknown>)
        .then(() => {
          queryClient.invalidateQueries({
            queryKey: sessionQueryKey,
          });
        })
        .catch((error) => {
          console.error("Failed to update hasOnboarded:", error);
          queryClient.setQueryData(sessionQueryKey, session);
        });
    }

    router.navigate({ to: "/" });
  };

  const steps: OnboardingStepEntry[] = [
    {
      step: 0,
      title: "Getting Started",
      description:
        "Add your details to your account; choose your username and upload a profile picture.",
      component: (
        <GettingStartedStep
          onComplete={() => handleStepComplete(1)}
          onSkip={() => handleSkip(1)}
        />
      ),
      skippable: true,
    },
    {
      step: 1,
      title: "Create Your Workspace",
      description: "Set up your organization and first project",
      component: <CreateOrgStep onComplete={() => handleStepComplete(2)} />,
      skippable: false,
    },
    {
      step: 2,
      title: "Install SDK",
      description: "Get started with our SDK",
      component: (
        <InstallSDKStep
          onComplete={() => handleStepComplete(3)}
          onSkip={() => handleSkip(3)}
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
          onComplete={() => handleStepComplete(3, false)}
          onSkip={() => handleFinish()}
        />
      ),
      skippable: true,
    },
  ];

  const currentStepEntry = steps.find(
    (step) => step.step === currentStep
  ) as OnboardingStepEntry;

  return (
    <div className="flex min-h-screen min-w-screen items-center justify-center bg-ui-bg-subtle">
      <PageHeader
        email={session?.user?.email}
        image={session?.user?.image ?? undefined}
      />
      <div className="flex flex-col">
        <div className="h-[60vh]">
          {currentStepEntry && (
            <div className="relative flex h-full min-w-[400px] flex-col gap-8">
              <CurrentStepHeader currentStep={currentStepEntry} />
              <div className="h-full">{currentStepEntry.component}</div>
            </div>
          )}
        </div>
        <Breadcrumb currentStepIndex={currentStep} steps={steps.length} />
      </div>
    </div>
  );
}
