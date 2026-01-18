import { createFileRoute, Outlet } from "@tanstack/react-router";
import ProjectLayout from "@/components/common/layouts/project-layout";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ProjectLayout>
      <Outlet />
    </ProjectLayout>
  );
}
