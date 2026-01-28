import { Skeleton } from "@gradual/ui/skeleton";
import { useParams } from "@tanstack/react-router";
import { Suspense } from "react";
import MainFlagView from "./main-flag-view";

function FlagPageSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      {/* Subheader skeleton (environment tabs) */}
      <div className="flex items-center gap-2 border-b px-6 py-3">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      {/* Content area skeleton */}
      <div className="p-6">
        <Skeleton className="h-[calc(70vh-0.5rem)] w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function FlagPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/$flagSlug/",
  });

  return (
    <div className="h-full">
      <Suspense fallback={<FlagPageSkeleton />}>
        <MainFlagView
          flagSlug={params.flagSlug}
          organizationSlug={params.organizationSlug}
          projectSlug={params.projectSlug}
        />
      </Suspense>
    </div>
  );
}
