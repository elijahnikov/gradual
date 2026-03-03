import { cn } from "@gradual/ui";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { RiCheckLine, RiExternalLinkLine } from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Suspense } from "react";
import { authClient } from "@/auth/client";
import { useTRPC } from "@/lib/trpc";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Perfect for getting started",
    productId: "89d57bae-1a06-45bf-9f6a-bf437862e775",
    features: [
      "1 project",
      "2 environments",
      "1 team member",
      "Up to 1,000 monthly active users",
      "Basic analytics",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing teams",
    productId: "9dabe3e7-ef5c-48ba-a1fa-c0446ff99864",
    features: [
      "Unlimited projects",
      "Unlimited environments",
      "10 team members",
      "Up to 25,000 monthly active users",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For large organizations",
    productId: "702b22c1-f1f7-4aa8-828b-56e322f9a7c2",
    features: [
      "Unlimited projects",
      "Unlimited environments",
      "Unlimited team members",
      "Unlimited monthly active users",
      "Dedicated support",
      "Custom integrations",
    ],
  },
] as const;

type Plan = (typeof PLANS)[number];

const FREE_PLAN: Plan = PLANS[0];

const PLAN_BY_PRODUCT_ID = new Map<string, Plan>(
  PLANS.map((plan) => [plan.productId, plan])
);

export default function BillingSettings() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col">
          <div className="flex h-12 min-h-12 items-center border-b bg-ui-bg-subtle px-4 py-2">
            <Skeleton className="h-3.5 w-48" />
          </div>
          <div className="flex flex-col gap-3 border-b p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-32 max-w-lg rounded-lg" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="flex flex-col gap-3 border-b p-4">
            <Skeleton className="h-4 w-16" />
            <div className="flex max-w-lg flex-col gap-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-2 max-w-lg rounded-full" />
            </div>
          </div>
        </div>
      }
    >
      <BillingSettingsContent />
    </Suspense>
  );
}

function BillingSettingsContent() {
  const trpc = useTRPC();
  const { organizationSlug } = useParams({ strict: false });

  const { data: organization } = useSuspenseQuery(
    trpc.organization.getBySlug.queryOptions({
      organizationSlug: organizationSlug as string,
    })
  );

  const { data: subscriptionsData } = useSuspenseQuery(
    trpc.auth.listSubscriptionsByOrganizationId.queryOptions({
      organizationId: organization.id,
    })
  );

  const { data: usage } = useSuspenseQuery(
    trpc.usage.getUsageByOrganizationId.queryOptions({
      organizationId: organization.id,
    })
  );

  // biome-ignore lint/suspicious/noExplicitAny: Polar response shape
  const subscriptionItems = (subscriptionsData as any)?.result?.items;
  const activeSubscription =
    Array.isArray(subscriptionItems) && subscriptionItems.length > 0
      ? subscriptionItems[0]
      : null;
  const currentPlan: Plan = activeSubscription
    ? (PLAN_BY_PRODUCT_ID.get(activeSubscription.productId) ?? FREE_PLAN)
    : FREE_PLAN;
  const currentPlanIndex = PLANS.indexOf(currentPlan);

  const handleManageBilling = () => {
    window.open("/api/auth/customer/portal", "_blank");
  };

  const handleUpgrade = async (productId: string) => {
    await authClient.checkout({
      products: [productId],
      referenceId: organization.id,
    });
  };

  const usagePercent =
    usage.mauLimit !== null
      ? Math.min((usage.currentMAU / usage.mauLimit) * 100, 100)
      : 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 min-h-12 items-center border-b bg-ui-bg-subtle px-4 py-2">
        <Text className="text-ui-fg-muted" size="xsmall">
          Manage your subscription plan and usage
        </Text>
      </div>

      <div className="flex flex-col gap-3 border-b p-4">
        <Text size="small" weight="plus">
          Current Plan
        </Text>
        <Card className="flex max-w-lg flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Text size="small" weight="plus">
                {currentPlan.name}
              </Text>
              <Badge variant="outline">{currentPlan.description}</Badge>
            </div>
            <Text size="small" weight="plus">
              {currentPlan.price}
              <span className="font-normal text-ui-fg-muted">
                {currentPlan.period}
              </span>
            </Text>
          </div>
          <ul className="flex flex-col gap-1.5">
            {currentPlan.features.map((feature) => (
              <li className="flex items-center gap-2" key={feature}>
                <RiCheckLine className="size-3.5 shrink-0 text-green-500" />
                <Text className="text-ui-fg-subtle" size="xsmall">
                  {feature}
                </Text>
              </li>
            ))}
          </ul>
        </Card>
        <div className="flex items-center gap-2">
          {activeSubscription && (
            <Button
              className="gap-x-1.5"
              onClick={handleManageBilling}
              size="small"
              variant="outline"
            >
              Manage Billing
              <RiExternalLinkLine className="size-3.5" />
            </Button>
          )}
          {PLANS.map((plan, index) => {
            if (index <= currentPlanIndex) {
              return null;
            }
            return (
              <Button
                key={plan.productId}
                onClick={() => handleUpgrade(plan.productId)}
                size="small"
                variant="gradual"
              >
                Upgrade to {plan.name}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b p-4">
        <Text size="small" weight="plus">
          Usage
        </Text>
        <div className="flex max-w-lg flex-col gap-2">
          <div className="flex items-center justify-between">
            <Text className="text-ui-fg-muted" size="xsmall">
              Monthly Active Users
            </Text>
            <Text size="xsmall" weight="plus">
              {usage.currentMAU.toLocaleString()}
              {usage.mauLimit !== null ? (
                <span className="font-normal text-ui-fg-muted">
                  {" "}
                  / {usage.mauLimit.toLocaleString()}
                </span>
              ) : (
                <span className="font-normal text-ui-fg-muted">
                  {" "}
                  / Unlimited
                </span>
              )}
            </Text>
          </div>
          {usage.mauLimit !== null && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-ui-bg-subtle">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  usage.limitReached ? "bg-ui-fg-error" : "bg-ui-fg-interactive"
                )}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
          {usage.limitReached && (
            <Text className="text-ui-fg-error" size="xsmall">
              You've reached your MAU limit. Upgrade your plan for more
              capacity.
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
