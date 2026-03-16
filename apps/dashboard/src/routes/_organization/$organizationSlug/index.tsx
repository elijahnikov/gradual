import { createFileRoute } from "@tanstack/react-router";
import OrgHomePage from "@/components/pages/org-home-page";

export const Route = createFileRoute("/_organization/$organizationSlug/")({
  component: OrgHomePage,
  head: () => ({ meta: [{ title: "Overview | Gradual" }] }),
});
