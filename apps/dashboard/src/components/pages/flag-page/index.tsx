import { Skeleton } from "@gradual/ui/skeleton";
import { useParams } from "@tanstack/react-router";
import { Suspense } from "react";
import MainFlagView from "./main-flag-view";

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

function FlagPageSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      {/* Flag Header Skeleton */}
      <div className="flex items-start justify-between border-b px-4 py-3">
        <div className="flex w-full flex-col gap-y-1">
          {/* Title */}
          <Skeleton className="h-7 w-48" />
          {/* Description */}
          <Skeleton className="mt-1 h-5 w-72" />
          {/* Metadata row */}
          <div className="mt-4 flex w-full items-center justify-between gap-x-6">
            {/* Key */}
            <div className="flex items-center gap-1">
              <Skeleton className="size-4 rounded" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-5 rounded" />
            </div>
            {/* Right side metadata */}
            <div className="flex items-center gap-x-6">
              {/* Created date */}
              <div className="flex items-center gap-x-1">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              {/* Updated date */}
              <div className="flex items-center gap-x-1">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-20" />
              </div>
              {/* Assignee */}
              <div className="flex min-w-44 items-center gap-1.5 px-1.5 py-1">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flag Subheader Skeleton */}
      <div className="sticky top-0 z-50 flex min-h-10 items-center justify-between border-b bg-ui-bg-base px-3 py-2">
        {/* Tabs */}
        <div className="flex h-8 items-center gap-1 rounded-md border bg-ui-bg-base p-1">
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
          <Skeleton className="h-6 w-14 rounded" />
          <Skeleton className="h-6 w-14 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        {/* Environment select */}
        <Skeleton className="h-7 w-40 rounded-md" />
      </div>

      {/* Content Skeleton */}
      <div className="p-3 sm:p-4">
        <Skeleton className="h-[calc(60vh-0.5rem)] w-full rounded-lg" />
      </div>
    </div>
  );
}
