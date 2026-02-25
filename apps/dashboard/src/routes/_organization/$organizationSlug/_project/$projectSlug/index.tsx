import { createFileRoute } from "@tanstack/react-router";
import ProjectHomePageComponent from "@/components/pages/project-home-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/"
)({
  component: RouteComponent,
  loader: ({ context, params }) => {
    const { queryClient, trpc } = context;

    void queryClient.prefetchQuery(
      trpc.project.getHomeSummary.queryOptions({
        organizationSlug: params.organizationSlug,
        projectSlug: params.projectSlug,
      })
    );
  },
});

function RouteComponent() {
  return <ProjectHomePageComponent />;
}
