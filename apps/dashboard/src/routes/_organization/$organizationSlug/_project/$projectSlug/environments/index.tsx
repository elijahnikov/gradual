import { createFileRoute } from "@tanstack/react-router";
import EnvironmentsPageComponent from "@/components/pages/environments-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/environments/"
)({
  component: RouteComponent,
  loader: ({ context, params }) => {
    const { queryClient, trpc } = context;
    void Promise.all([
      queryClient.prefetchQuery(
        trpc.project.getBySlug.queryOptions({
          slug: params.projectSlug,
          organizationSlug: params.organizationSlug,
        })
      ),
    ]);
  },
});

function RouteComponent() {
  return <EnvironmentsPageComponent />;
}
