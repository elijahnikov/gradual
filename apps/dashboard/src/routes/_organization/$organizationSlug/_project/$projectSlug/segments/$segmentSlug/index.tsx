import { createFileRoute } from "@tanstack/react-router";
import SegmentPageComponent from "@/components/pages/segment-page";

export const Route = createFileRoute(
  "/_organization/$organizationSlug/_project/$projectSlug/segments/$segmentSlug/"
)({
  component: RouteComponent,
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
  return <SegmentPageComponent />;
}
