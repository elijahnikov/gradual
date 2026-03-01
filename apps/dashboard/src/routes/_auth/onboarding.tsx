import { createFileRoute } from "@tanstack/react-router";
import OnboardingPageComponent from "@/components/pages/auth/onboarding-page";

export const Route = createFileRoute("/_auth/onboarding")({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Onboarding · Gradual" }] }),
});

function RouteComponent() {
  return <OnboardingPageComponent />;
}
