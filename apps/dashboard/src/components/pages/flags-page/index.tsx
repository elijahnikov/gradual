import { useParams } from "@tanstack/react-router";
import { Suspense } from "react";
import FlagsList, { FlagsListSkeleton } from "./flags-list";
import FlagFilterBar from "./flags-list/flag-filter-bar";

export default function FlagsPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/",
  });

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col sm:h-[calc(100vh-3.75rem)] sm:min-h-[calc(100vh-3.75rem)]">
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
