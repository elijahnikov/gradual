import { createFileRoute } from "@tanstack/react-router";
import OrgSettingsPage from "@/components/pages/org-settings-page";

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
  return <OrgSettingsPage />;
}
