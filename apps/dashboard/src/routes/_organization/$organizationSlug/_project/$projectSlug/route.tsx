import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { LiveEvaluationProvider } from "@/hooks/use-live-evaluations";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";
import { useTRPC } from "@/lib/trpc";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug"
)({
  component: RouteComponent,
  beforeLoad: ({ context, params }) => {
    const { queryClient, trpc } = context;
    void queryClient.prefetchQuery(
      trpc.project.getBreadcrumbs.queryOptions({
        organizationSlug: params.organizationSlug as string,
        projectSlug: params.projectSlug as string,
      })
    );
    void queryClient.prefetchQuery(
      trpc.project.getBySlug.queryOptions({
        organizationSlug: params.organizationSlug as string,
        slug: params.projectSlug as string,
      })
    );
  },
});

function RouteComponent() {
  const trpc = useTRPC();
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug",
  });

  const { data: project } = useQuery(
    trpc.project.getBySlug.queryOptions({
      organizationSlug,
      slug: projectSlug,
    })
  );

  useEffect(() => {
    if (project) {
      addRecentVisit({
        path: `/${organizationSlug}/${projectSlug}`,
        title: project.name,
        subtitle: organizationSlug,
        emoji: project.emoji ?? undefined,
        type: "project",
      });
    }
  }, [project, organizationSlug, projectSlug]);

  return (
    <LiveEvaluationProvider>
      <Outlet />
    </LiveEvaluationProvider>
  );
}
