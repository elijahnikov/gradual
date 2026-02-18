import { RiAddLine } from "@remixicon/react";
import { useParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import CreateSegmentDialog from "@/components/common/dialogs/create-segment-dialog";
import SegmentsList, { SegmentsListSkeleton } from "./segments-list";
import SegmentFilterBar from "./segments-list/segment-filter-bar";

export default function SegmentsPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/segments/",
  });
  const [createSegmentOpen, setCreateSegmentOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col sm:h-[calc(100vh-3.75rem)] sm:min-h-[calc(100vh-3.75rem)]">
      <div className="absolute top-0 right-1.25 z-50 flex h-9 items-center">
        <CreateSegmentDialog
          onOpenChange={setCreateSegmentOpen}
          open={createSegmentOpen}
        >
          <RiAddLine className="-mr-0.5 size-4" />
          Create segment
        </CreateSegmentDialog>
      </div>
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
