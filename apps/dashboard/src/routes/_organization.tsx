import { createFileRoute, Outlet } from "@tanstack/react-router";
import GlobalOrganizationLayout from "~/components/common/organization-layout";

export const Route = createFileRoute("/_organization")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <GlobalOrganizationLayout>
      <Outlet />
    </GlobalOrganizationLayout>
  );
}
