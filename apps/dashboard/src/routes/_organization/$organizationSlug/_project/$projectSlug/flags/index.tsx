import { createFileRoute } from "@tanstack/react-router";
import FlagsPageComponent from "@/components/pages/flags-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/flags/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <FlagsPageComponent />;
}
