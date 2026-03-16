import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import AnalyticsPageComponent from "@/components/pages/analytics-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/analytics/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Analytics · Gradual" }] }),
});

function RouteComponent() {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/analytics/",
  });

  useEffect(() => {
    addRecentVisit({
      path: `/${organizationSlug}/${projectSlug}/analytics`,
      title: "Analytics",
      subtitle: projectSlug,
      type: "analytics",
    });
  }, [organizationSlug, projectSlug]);

  return <AnalyticsPageComponent />;
}
