import { createFileRoute } from "@tanstack/react-router";
import FlagsPageComponent from "@/components/pages/flags-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/flags/"
)({
  component: RouteComponent,
  beforeLoad: ({ context, params }) => {
    void context.queryClient.prefetchQuery(
      context.trpc.organization.getBySlug.queryOptions({
        organizationSlug: params.organizationSlug,
      })
    );
    void context.queryClient.prefetchQuery(
      context.trpc.project.getBySlug.queryOptions({
        slug: params.projectSlug,
        organizationSlug: params.organizationSlug,
      })
    );
    void context.queryClient.ensureQueryData(
      context.trpc.featureFlags.getAll.queryOptions({
        projectSlug: params.projectSlug,
        organizationSlug: params.organizationSlug,
      })
    );
  },
});

function RouteComponent() {
  return <FlagsPageComponent />;
}
