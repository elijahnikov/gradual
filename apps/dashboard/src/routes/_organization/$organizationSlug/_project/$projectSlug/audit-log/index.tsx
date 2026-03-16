import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import AuditLogPageComponent from "@/components/pages/audit-log-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/audit-log/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Audit Log · Gradual" }] }),
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
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/audit-log/",
  });

  useEffect(() => {
    addRecentVisit({
      path: `/${organizationSlug}/${projectSlug}/audit-log`,
      title: "Audit Log",
      subtitle: projectSlug,
      type: "audit-log",
    });
  }, [organizationSlug, projectSlug]);

  return <AuditLogPageComponent />;
}
