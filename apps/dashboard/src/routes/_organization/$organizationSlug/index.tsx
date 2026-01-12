import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/_organization/$organizationSlug/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/",
  });
  return (
    <div>
      Hello "/_organization-layout-route/$organizationSlug/"! {organizationSlug}
    </div>
  );
}
