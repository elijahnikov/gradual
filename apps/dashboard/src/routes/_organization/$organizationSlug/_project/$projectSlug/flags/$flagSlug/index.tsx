import { createFileRoute, useParams } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/flags/$flagSlug/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/$flagSlug/",
  });
  return (
    <div>
      Hello
      "/_organization/$organizationSlug/_project/$projectSlug/flags/$flagSlug/"!
      {params.flagSlug}
    </div>
  );
}
