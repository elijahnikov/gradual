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
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-50 flex min-h-10 items-center justify-between border-b bg-ui-bg-base px-3 py-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-8 w-96 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-40 rounded-md" />
        </div>

        <div className="p-3 sm:p-4">
          <Skeleton className="h-[calc(100vh-10rem)] w-full rounded-lg" />
        </div>
      </div>

      <div className="flex h-full w-72 min-w-72 flex-col border-l bg-ui-bg-base">
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="h-px bg-ui-border-base" />
        <div className="flex flex-col gap-1 p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="h-px bg-ui-border-base" />
        <div className="flex flex-col gap-2 p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
        <div className="h-px bg-ui-border-base" />
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
