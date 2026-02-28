import { createFileRoute } from "@tanstack/react-router";
import AuditLogPageComponent from "@/components/pages/audit-log-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/audit-log/"
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
  return <AuditLogPageComponent />;
}
