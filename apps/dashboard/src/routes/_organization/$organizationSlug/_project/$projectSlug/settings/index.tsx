import { createFileRoute } from "@tanstack/react-router";
import SettingsPage from "@/components/pages/settings-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/settings/"
)({
  component: RouteComponent,
  loader: ({ context, params }) => {
    const { queryClient, trpc } = context;
    void queryClient.prefetchQuery(
      trpc.webhooks.list.queryOptions({
        organizationSlug: params.organizationSlug,
      })
    );
  },
});

function RouteComponent() {
  return <SettingsPage />;
}
