import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/",
  });
  return (
    <div>
      Hello {params.organizationSlug} / {params.projectSlug}!
    </div>
  );
}
