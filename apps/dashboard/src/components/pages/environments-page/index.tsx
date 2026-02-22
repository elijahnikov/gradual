import { RiAddLine } from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import CreateEnvironmentDialog from "@/components/common/dialogs/create-environment-dialog";
import { useTRPC } from "@/lib/trpc";
import EnvironmentsList, {
  EnvironmentsListSkeleton,
} from "./environments-list";
import EnvironmentFilterBar from "./environments-list/environment-filter-bar";

export default function EnvironmentsPageComponent() {
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/environments/",
  });
  const [createEnvironmentOpen, setCreateEnvironmentOpen] = useState(false);

  const trpc = useTRPC();
  const { data: project } = useSuspenseQuery(
    trpc.project.getBySlug.queryOptions({
      slug: params.projectSlug,
      organizationSlug: params.organizationSlug,
    })
  );

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col sm:h-[calc(100vh-3.75rem)] sm:min-h-[calc(100vh-3.75rem)]">
      <div className="absolute top-0 right-1.25 z-50 flex h-9 items-center">
        <CreateEnvironmentDialog
          onOpenChange={setCreateEnvironmentOpen}
          open={createEnvironmentOpen}
        >
          <RiAddLine className="-mr-0.5 size-4" />
          Create environment
        </CreateEnvironmentDialog>
      </div>
      <EnvironmentFilterBar />
      <Suspense fallback={<EnvironmentsListSkeleton />}>
        <EnvironmentsList
          organizationId={project.organizationId}
          organizationSlug={params.organizationSlug}
          projectId={project.id}
          projectSlug={params.projectSlug}
        />
      </Suspense>
    </div>
  );
}
