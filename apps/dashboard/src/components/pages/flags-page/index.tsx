import { RiAddLine } from "@remixicon/react";
import { useParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import CreateFlagDialog from "@/components/common/dialogs/create-flag-dialog";
import FlagsList, { FlagsListSkeleton } from "./flags-list";
import FlagFilterBar from "./flags-list/flag-filter-bar";

export default function FlagsPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/",
  });
  const [createFlagOpen, setCreateFlagOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col sm:h-[calc(100vh-3.75rem)] sm:min-h-[calc(100vh-3.75rem)]">
      <div className="absolute top-0 right-1.25 z-50 flex h-9 items-center">
        <CreateFlagDialog
          onOpenChange={setCreateFlagOpen}
          open={createFlagOpen}
        >
          <RiAddLine className="-mr-0.5 size-4" />
          Create flag
        </CreateFlagDialog>
      </div>
      <FlagFilterBar
        organizationSlug={params.organizationSlug}
        projectSlug={params.projectSlug}
      />
      <Suspense fallback={<FlagsListSkeleton />}>
        <FlagsList
          organizationSlug={params.organizationSlug}
          projectSlug={params.projectSlug}
        />
      </Suspense>
    </div>
  );
}
