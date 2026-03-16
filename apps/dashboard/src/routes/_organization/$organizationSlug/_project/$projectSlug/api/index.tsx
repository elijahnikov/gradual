import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import ApiKeysPage from "@/components/pages/api-keys-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/api/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "API Keys · Gradual" }] }),
  loader: async ({ context, params }) => {
    const { queryClient, trpc } = context;
    const project = await queryClient.ensureQueryData(
      trpc.project.getBySlug.queryOptions({
        slug: params.projectSlug,
        organizationSlug: params.organizationSlug,
      })
    );
    void queryClient.prefetchQuery(
      trpc.apiKey.listByOrganizationIdAndProjectId.queryOptions({
        organizationId: project.organizationId,
        projectId: project.id,
      })
    );
  },
});

function RouteComponent() {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/api/",
  });

  useEffect(() => {
    addRecentVisit({
      path: `/${organizationSlug}/${projectSlug}/api`,
      title: "API Keys",
      subtitle: projectSlug,
      type: "api-keys",
    });
  }, [organizationSlug, projectSlug]);

  return <ApiKeysPage />;
}
