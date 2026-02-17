import { createFileRoute } from "@tanstack/react-router";
import SegmentsPageComponent from "@/components/pages/segments-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/segments/"
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
  return <SegmentsPageComponent />;
}
