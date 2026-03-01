import { createFileRoute } from "@tanstack/react-router";
import EnvironmentsPageComponent from "@/components/pages/environments-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/environments/"
)({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const { queryClient, trpc } = context;
    const project = await queryClient.ensureQueryData(
      trpc.project.getBySlug.queryOptions({
        slug: params.projectSlug,
        organizationSlug: params.organizationSlug,
      })
    );
    void queryClient.prefetchQuery(
      trpc.environment.list.queryOptions({
        organizationId: project.organizationId,
        projectId: project.id,
      })
    );
  },
});

function RouteComponent() {
  return <EnvironmentsPageComponent />;
}
