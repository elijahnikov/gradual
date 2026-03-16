import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import OrgSettingsPage from "@/components/pages/org-settings-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/settings/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Organization Settings · Gradual" }] }),
  loader: ({ context, params }) => {
    const { queryClient, trpc } = context;
    void queryClient.prefetchQuery(
      trpc.webhooks.list.queryOptions({
        organizationSlug: params.organizationSlug,
      })
    );
    void queryClient.prefetchQuery(
      trpc.organizationMember.getMembers.queryOptions({
        organizationSlug: params.organizationSlug,
        getWithPermissions: true,
        limit: 100,
      })
    );
  },
});

function RouteComponent() {
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/settings/",
  });

  useEffect(() => {
    addRecentVisit({
      path: `/${organizationSlug}/settings`,
      title: "Settings",
      subtitle: organizationSlug,
      type: "settings",
    });
  }, [organizationSlug]);

  return <OrgSettingsPage />;
}
