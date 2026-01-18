import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/environments/$environmentSlug/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/environments/$environmentSlug/",
  });
  return (
    <div>
      Hello
      "/_organization/$organizationSlug/_project/$projectSlug/environments/$environmentSlug/"!
      {params.environmentSlug}
    </div>
  );
}
