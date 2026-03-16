import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import SegmentsPageComponent from "@/components/pages/segments-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/segments/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Segments · Gradual" }] }),
  loader: ({ context, params }) => {
    const { queryClient, trpc } = context;
    void Promise.all([
      queryClient.prefetchQuery(
        trpc.project.getBySlug.queryOptions({
          slug: params.projectSlug,
          organizationSlug: params.organizationSlug,
        })
      ),
      queryClient.prefetchInfiniteQuery(
        trpc.segments.list.infiniteQueryOptions(
          {
            projectSlug: params.projectSlug,
            organizationSlug: params.organizationSlug,
            limit: 20,
            sortBy: "createdAt",
            sortOrder: "desc",
            search: undefined,
          },
          {
            getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
          }
        )
      ),
    ]);
  },
});

function RouteComponent() {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/segments/",
  });

  useEffect(() => {
    addRecentVisit({
      path: `/${organizationSlug}/${projectSlug}/segments`,
      title: "Segments",
      subtitle: projectSlug,
      type: "segments",
    });
  }, [organizationSlug, projectSlug]);

  return <SegmentsPageComponent />;
}
