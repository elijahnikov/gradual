import { createFileRoute } from "@tanstack/react-router";
import AnalyticsPageComponent from "@/components/pages/analytics-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/analytics/"
)({
  component: AnalyticsPageComponent,
  head: () => ({ meta: [{ title: "Analytics · Gradual" }] }),
});
