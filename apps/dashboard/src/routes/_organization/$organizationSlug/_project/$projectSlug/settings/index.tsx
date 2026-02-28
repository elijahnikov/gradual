import { createFileRoute } from "@tanstack/react-router";
import WebhooksSettingsPage from "@/components/pages/webhooks-settings-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/settings/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <WebhooksSettingsPage />;
}
