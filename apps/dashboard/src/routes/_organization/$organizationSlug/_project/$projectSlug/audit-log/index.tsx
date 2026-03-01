import { createFileRoute } from "@tanstack/react-router";
import AuditLogPageComponent from "@/components/pages/audit-log-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/audit-log/"
)({
  component: RouteComponent,
  loader: ({ context, params }) => {
    const { queryClient, trpc } = context;
    void queryClient.prefetchInfiniteQuery(
      trpc.auditLog.list.infiniteQueryOptions(
        {
          organizationSlug: params.organizationSlug,
          projectSlug: params.projectSlug,
          limit: 50,
        },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        }
      )
    );
  },
});

function RouteComponent() {
  return <AuditLogPageComponent />;
}
