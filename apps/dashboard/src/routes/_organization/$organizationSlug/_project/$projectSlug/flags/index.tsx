import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import FlagsPageComponent from "@/components/pages/flags-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/flags/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Flags · Gradual" }] }),
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
        trpc.featureFlags.getAll.infiniteQueryOptions(
          {
            projectSlug: params.projectSlug,
            organizationSlug: params.organizationSlug,
            limit: 10,
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
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/",
  });

  useEffect(() => {
    addRecentVisit({
      path: `/${organizationSlug}/${projectSlug}/flags`,
      title: "Flags",
      subtitle: projectSlug,
      type: "flags",
    });
  }, [organizationSlug, projectSlug]);

  return <FlagsPageComponent />;
}
