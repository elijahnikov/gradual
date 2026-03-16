import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import SegmentPageComponent from "@/components/pages/segment-page";
import { addRecentVisit } from "@/lib/hooks/use-recently-visited";
import { useTRPC } from "@/lib/trpc";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/segments/$segmentSlug/"
)({
  component: RouteComponent,
  head: () => ({ meta: [{ title: "Segment · Gradual" }] }),
  loader: async ({ context, params }) => {
    const { queryClient, trpc } = context;
    const { projectSlug, organizationSlug, segmentSlug } = params;

    try {
      await queryClient.fetchQuery(
        trpc.segments.getByKey.queryOptions({
          projectSlug,
          organizationSlug,
          key: segmentSlug,
        })
      );
    } catch (error) {
      if (error && typeof error === "object" && "silent" in error) {
        return;
      }
      throw error;
    }
  },
});

function RouteComponent() {
  const trpc = useTRPC();
  const { organizationSlug, projectSlug, segmentSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/segments/$segmentSlug/",
  });

  const { data: segment } = useQuery(
    trpc.segments.getByKey.queryOptions({
      projectSlug,
      organizationSlug,
      key: segmentSlug,
    })
  );

  useEffect(() => {
    if (segment) {
      addRecentVisit({
        path: `/${organizationSlug}/${projectSlug}/segments/${segmentSlug}`,
        title: segment.name,
        subtitle: projectSlug,
        type: "segment",
      });
    }
  }, [segment, organizationSlug, projectSlug, segmentSlug]);

  return <SegmentPageComponent />;
}
