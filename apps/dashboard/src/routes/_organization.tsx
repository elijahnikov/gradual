import { createFileRoute, Outlet } from "@tanstack/react-router";
import GlobalOrganizationLayout from "@/components/common/layouts/organization-layout";

export const Route = createFileRoute("/_organization")({
  component: RouteComponent,
  loader: ({ context }) => {
    const { queryClient, trpc } = context;
    void queryClient.ensureQueryData(trpc.auth.getSession.queryOptions());
  },
});

function RouteComponent() {
  return (
    <GlobalOrganizationLayout>
      <Outlet />
    </GlobalOrganizationLayout>
  );
}
