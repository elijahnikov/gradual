import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import EnvironmentsPageComponent from "@/components/pages/environments-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/environments/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Environments · Gradual" }] }),
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
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/environments/",
  });

  useEffect(() => {
    addRecentVisit({
      path: `/${organizationSlug}/${projectSlug}/environments`,
      title: "Environments",
      subtitle: projectSlug,
      type: "environments",
    });
  }, [organizationSlug, projectSlug]);

  return <EnvironmentsPageComponent />;
}
