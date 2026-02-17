import { useParams } from "@tanstack/react-router";
import { Suspense } from "react";
import SegmentsList, { SegmentsListSkeleton } from "./segments-list";
import SegmentFilterBar from "./segments-list/segment-filter-bar";

export default function SegmentsPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/segments/",
  });

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col sm:h-[calc(100vh-3.75rem)] sm:min-h-[calc(100vh-3.75rem)]">
      <SegmentFilterBar />
      <Suspense fallback={<SegmentsListSkeleton />}>
        <SegmentsList
          organizationSlug={params.organizationSlug}
          projectSlug={params.projectSlug}
        />
      </Suspense>
    </div>
  );
}
