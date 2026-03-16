import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import SettingsPage from "@/components/pages/settings-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/settings/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Settings · Gradual" }] }),
});

function RouteComponent() {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });

  useEffect(() => {
    addRecentVisit({
      path: `/${organizationSlug}/${projectSlug}/settings`,
      title: "Project Settings",
      subtitle: projectSlug,
      type: "project-settings",
    });
  }, [organizationSlug, projectSlug]);

  return <SettingsPage />;
}
