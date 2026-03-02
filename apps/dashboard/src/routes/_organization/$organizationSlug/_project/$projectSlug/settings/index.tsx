import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/components/pages/settings-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/settings/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Settings · Gradual" }] }),
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
  return <SettingsPage />;
}
