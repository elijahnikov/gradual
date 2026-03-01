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
      "1 project",
      "2 environments",
      "1 team member",
      "Up to 1,000 monthly active users",
      "Basic analytics",
      "Community support",
    ],
    price: "$0",
    productId: "89d57bae-1a06-45bf-9f6a-bf437862e775",
  },
  {
    slug: "Pro",
    name: "Pro",
    description: "For growing teams",
    features: [
      "Unlimited projects",
      "Unlimited environments",
      "10 team members",
      "Up to 25,000 monthly active users",
      "Advanced analytics",
      "Priority support",
    ],
    price: "$29",
    productId: "9dabe3e7-ef5c-48ba-a1fa-c0446ff99864",
  },
  {
    slug: "Enterprise",
    name: "Enterprise",
    description: "For large organizations",
    features: [
      "Unlimited projects",
      "Unlimited environments",
      "Unlimited team members",
      "Unlimited monthly active users",
      "Dedicated support",
      "Custom integrations",
      "Advanced security",
    ],
    price: "$99",
    productId: "702b22c1-f1f7-4aa8-828b-56e322f9a7c2",
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
    enabled: !!createdOrganizationId,
  });

  // biome-ignore lint/suspicious/noExplicitAny: <>
  const hasSubscription = (subscriptions as any)?.result?.items?.length > 0;

  useEffect(() => {
    previewStore
      .getState()
      .setStepCanContinue(!isLoadingProp && hasSubscription);
    previewStore.getState().setStepIsSubmitting(isLoadingProp);
  }, [isLoadingProp, hasSubscription, previewStore]);

  const handleSelectPlan = useCallback(
    async (productId: string, planName: string) => {
      console.log("[checkout] clicked", {
        productId,
        planName,
        createdOrganizationId,
      });
      previewStore.getState().setSelectedPlan(planName);
      try {
        const result = await authClient.checkout({
          products: [productId],
          referenceId: createdOrganizationId,
        });
        console.log("[checkout] result", result);
      } catch (error) {
        console.error("[checkout] error", error);
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
