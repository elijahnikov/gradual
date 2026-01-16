"use client";

import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { RiCheckLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { authClient } from "@/auth/client";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useTRPC } from "@/lib/trpc";

interface PlanSelectionStepProps {
  onComplete: () => void;
  onSkip: () => void;
  isLoadingProp?: boolean;
}

const PLANS = [
  {
    slug: "Free",
    name: "Free",
    description: "Perfect for getting started",
    features: [
      "One project",
      "Unlimted feature flags",
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
      "Team collaboration",
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
  onComplete,
  onSkip,
  isLoadingProp = false,
}: PlanSelectionStepProps) {
  const trpc = useTRPC();
  const { createdOrganizationId } = useOnboardingStore();
  const { data: subscriptions } = useQuery({
    ...trpc.auth.listSubscriptionsByOrganizationId.queryOptions({
      organizationId: createdOrganizationId ?? "",
    }),
  });

  const handleSelectPlan = useCallback(
    async (productId: string) => {
      try {
        await authClient.checkout({
          products: [productId],
          referenceId: createdOrganizationId,
        });
      } catch (error) {
        console.error("Error initiating checkout:", error);
      }
    },
    [createdOrganizationId]
  );

  return (
    <div className="space-y-6">
      {/** biome-ignore lint/suspicious/noExplicitAny: <> */}
      {(subscriptions as any)?.result?.items?.length > 0 ? (
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
              className={cn("min-w-[300px] px-4 py-3 transition-all")}
              key={plan.slug}
            >
              <Heading level={"h1"}>{plan.name}</Heading>
              <Text className="text-ui-fg-subtle" weight="plus">
                {plan.description}
              </Text>
              <Text className="mt-2">
                <span className="font-semibold text-4xl">{plan.price}</span>
                <span className="text-ui-fg-subtle">/month</span>
              </Text>
              <Button
                className="mt-4 mb-2 w-full"
                onClick={() => handleSelectPlan(plan.productId)}
                variant={index === 0 ? "outline" : "gradual"}
              >
                Select Plan
              </Button>
              <Separator className="my-2" />
              <ul className="mt-2 space-y-2">
                {plan.features.map((feature) => (
                  <li className="flex items-center gap-2" key={feature}>
                    <RiCheckLine className="size-4 text-green-500" />
                    <Text className="text-ui-fg-subtle" weight="plus">
                      {feature}
                    </Text>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      <div className="absolute bottom-16 left-0 mt-auto flex w-1/2 translate-x-1/2 items-center justify-center gap-2 pt-4">
        <div className="flex w-[400px] gap-2">
          <Button
            className="whitespace-nowrap"
            disabled={isLoadingProp}
            onClick={onSkip}
            type="button"
            variant="outline"
          >
            Skip
          </Button>

          <LoadingButton
            className="w-full text-[13px]"
            disabled={
              isLoadingProp ||
              !subscriptions ||
              // biome-ignore lint/suspicious/noExplicitAny: <>
              (subscriptions as any)?.result?.items?.length === 0
            }
            loading={isLoadingProp}
            onClick={onComplete}
            type="button"
            variant="gradual"
          >
            Finish
          </LoadingButton>
        </div>
      </div>
    </div>
  );
}
