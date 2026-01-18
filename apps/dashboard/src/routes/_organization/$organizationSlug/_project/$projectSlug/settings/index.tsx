import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/settings/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      Hello "/_organization/$organizationSlug/_project/$projectSlug/settings/"!
    </div>
  );
}
