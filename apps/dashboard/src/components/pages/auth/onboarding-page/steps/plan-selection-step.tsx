"use client";

import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { RiCheckLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { authClient } from "@/auth/client";
import { useOnboardingPreviewStore } from "@/lib/stores/onboarding-preview-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useTRPC } from "@/lib/trpc";

interface PlanSelectionStepProps {
  isLoadingProp?: boolean;
}

const PLANS = [
  {
    slug: "Free",
    name: "Free",
    description: "Perfect for getting started",
    features: [
      "One project",
      "Unlimited feature flags",
      "Up to two environments",
      "100k evaluations per month",
      "Basic analytics",
      "Community support",
    ],
    price: "$0",
    productId: "fa8a8c64-d3ce-41f8-a28c-88073097e152",
  },
  {
    slug: "Pro",
    name: "Pro",
    description: "For growing teams",
    features: [
      "Everything in Free",
      "Unlimited projects",
      "Unlimited environments",
      "1 million evaluations per month",
      "Advanced analytics",
      "Priority support",
    ],
    price: "$15",
    productId: "4e1c7974-4814-4d97-a117-aa72aad58771",
  },
  {
    slug: "Enterprise",
    name: "Enterprise",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Unlimited projects",
      "Unlimited environments",
      "20 million evaluations per month",
      "Dedicated support",
      "Custom integrations",
      "Advanced security",
    ],
    price: "$39",
    productId: "d9376414-2b89-48a8-bdec-7a97ba70e1c4",
  },
];

export function PlanSelectionStep({
  isLoadingProp = false,
}: PlanSelectionStepProps) {
  const trpc = useTRPC();
  const { createdOrganizationId } = useOnboardingStore();
  const previewStore = useOnboardingPreviewStore;
  const { data: subscriptions } = useQuery({
    ...trpc.auth.listSubscriptionsByOrganizationId.queryOptions({
      organizationId: createdOrganizationId ?? "",
    }),
  });

  // biome-ignore lint/suspicious/noExplicitAny: <>
  const hasSubscription = (subscriptions as any)?.result?.items?.length > 0;

  // Report step action state to footer
  useEffect(() => {
    previewStore
      .getState()
      .setStepCanContinue(!isLoadingProp && hasSubscription);
    previewStore.getState().setStepIsSubmitting(isLoadingProp);
  }, [isLoadingProp, hasSubscription, previewStore]);

  const handleSelectPlan = useCallback(
    async (productId: string, planName: string) => {
      previewStore.getState().setSelectedPlan(planName);
      try {
        await authClient.checkout({
          products: [productId],
          referenceId: createdOrganizationId,
        });
      } catch (error) {
        console.error("Error initiating checkout:", error);
      }
    },
    [createdOrganizationId, previewStore]
  );

  return (
    <div className="flex flex-col space-y-6">
      {hasSubscription ? (
        <div className="mt-24 flex flex-col items-center justify-center gap-2">
          <RiCheckLine className="size-8 text-green-500" />
          <Heading>You have successfully chosen a plan</Heading>
          <Text className="text-ui-fg-muted" weight="plus">
            You can now finish the onboarding process and start using Gradual.
          </Text>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {PLANS.map((plan, index) => (
            <Card
              className={cn(
                "min-w-[200px] bg-ui-bg-base px-4 py-3 transition-all"
              )}
              key={plan.slug}
            >
              <Heading level="h1">{plan.name}</Heading>
              <Text className="text-ui-fg-subtle text-xs" weight="plus">
                {plan.description}
              </Text>
              <Text className="mt-2">
                <span className="font-semibold text-3xl">{plan.price}</span>
                <span className="text-ui-fg-subtle">/month</span>
              </Text>
              <Button
                className="mt-4 mb-2 w-full"
                onClick={() => handleSelectPlan(plan.productId, plan.name)}
                variant={index === 0 ? "outline" : "gradual"}
              >
                Select Plan
              </Button>
              <Separator className="my-2" />
              <ul className="mt-2 space-y-2">
                {plan.features.map((feature) => (
                  <li className="flex items-center gap-2" key={feature}>
                    <RiCheckLine className="size-4 text-green-500" />
                    <Text className="text-ui-fg-subtle text-xs" weight="plus">
                      {feature}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
