import { createFileRoute, Outlet } from "@tanstack/react-router";
import GlobalOrganizationLayout from "@/components/common/organization-layout";

export const Route = createFileRoute("/_organization")({
  component: RouteComponent,
  loader: ({ context }) => {
    const { queryClient, trpc } = context;
    void queryClient.prefetchQuery(trpc.auth.getSession.queryOptions());
  },
});

function RouteComponent() {
  return (
    <GlobalOrganizationLayout>
      <Outlet />
    </GlobalOrganizationLayout>
  );
}
