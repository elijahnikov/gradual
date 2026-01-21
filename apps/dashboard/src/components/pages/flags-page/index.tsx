import { useParams } from "@tanstack/react-router";
import { Suspense } from "react";
import FlagsList, { FlagsListSkeleton } from "./flags-list";

export default function FlagsPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/",
  });

  return (
    <div className="w-full">
      <Suspense fallback={<FlagsListSkeleton />}>
        <FlagsList
          organizationSlug={params.organizationSlug}
          projectSlug={params.projectSlug}
        />
      </Suspense>
    </div>
  );
}
