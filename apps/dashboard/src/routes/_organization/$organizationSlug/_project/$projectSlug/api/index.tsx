import { createFileRoute } from "@tanstack/react-router";
import ApiKeysPage from "@/components/pages/api-keys-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/api/"
)({
  component: ApiKeysPage,
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
