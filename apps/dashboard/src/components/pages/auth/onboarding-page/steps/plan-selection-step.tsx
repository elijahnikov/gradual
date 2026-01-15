"use client";

import { Button } from "@gradual/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gradual/ui/card";
import { useState } from "react";

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
      "Up to 10 feature flags",
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
      "Unlimited feature flags",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
    ],
    price: "Custom",
    productId: "4e1c7974-4814-4d97-a117-aa72aad58771",
  },
  {
    slug: "Enterprise",
    name: "Enterprise",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantee",
      "Advanced security",
    ],
    price: "Custom",
    productId: "d9376414-2b89-48a8-bdec-7a97ba70e1c4",
  },
];

export function PlanSelectionStep({
  onComplete,
  onSkip,
  isLoadingProp = false,
}: PlanSelectionStepProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectPlan = (planSlug: string, productId: string) => {
    setSelectedPlan(planSlug);
    setIsLoading(true);

    try {
      // TODO: Integrate with Polar checkout
      // For now, we'll just store the selection and allow the user to continue
      // The actual checkout can be handled in a separate flow or settings page
      console.log("Selected plan:", planSlug, "Product ID:", productId);

      // You can implement Polar checkout here:
      // const checkoutUrl = await authClient.polar.checkout({ productId });
      // if (checkoutUrl) window.location.href = checkoutUrl;

      onComplete();
    } catch (error) {
      console.error("Error selecting plan:", error);
      onComplete();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          Choose the plan that best fits your needs. You can always upgrade or
          downgrade later.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            className={`cursor-pointer transition-all ${
              selectedPlan === plan.slug
                ? "ring-2 ring-primary"
                : "hover:border-primary/50"
            }`}
            key={plan.slug}
            onClick={() => handleSelectPlan(plan.slug, plan.productId)}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="font-bold text-2xl">{plan.price}</span>
                {plan.price !== "$0" && plan.price !== "Custom" && (
                  <span className="text-muted-foreground text-sm">/month</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li className="flex items-start gap-2" key={feature}>
                    <span className="text-primary">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          disabled={isLoading || isLoadingProp}
          onClick={onSkip}
          type="button"
          variant="outline"
        >
          Skip for Now
        </Button>
        {selectedPlan && (
          <Button disabled={isLoading} onClick={onComplete} type="button">
            {isLoading ? "Processing..." : "Continue"}
          </Button>
        )}
      </div>
    </div>
  );
}
