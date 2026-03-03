import { Button } from "@gradual/ui/button";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { RiAddLine, RiFolder3Line } from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { Suspense, useState } from "react";
import CreateProjectDialog from "@/components/common/dialogs/create-project-dialog";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

function ProjectRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <Skeleton className="size-8 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-3.5 w-20" />
    </div>
  );
}

export default function ProjectsSettings() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col">
          <div className="flex h-12 min-h-12 items-center justify-between border-b bg-ui-bg-subtle px-4 py-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-28 rounded-md" />
          </div>
          <ProjectRowSkeleton />
          <ProjectRowSkeleton />
          <ProjectRowSkeleton />
        </div>
      }
    >
      <ProjectsSettingsContent />
    </Suspense>
  );
}

function ProjectsSettingsContent() {
  const trpc = useTRPC();
  const { organizationSlug } = useParams({ strict: false });
  const { canCreateProject } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: organization } = useSuspenseQuery(
    trpc.organization.getBySlug.queryOptions({
      organizationSlug: organizationSlug as string,
    })
  );

  const { data: projects } = useSuspenseQuery(
    trpc.project.getAllByOrganizationId.queryOptions({
      organizationId: organization.id,
    })
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 min-h-12 items-center justify-between border-b bg-ui-bg-subtle px-4 py-2">
        <Text className="text-ui-fg-muted" size="xsmall">
          {projects.length} {projects.length === 1 ? "project" : "projects"}
        </Text>
        <PermissionTooltip hasPermission={canCreateProject}>
          <Button
            className="gap-x-1"
            disabled={!canCreateProject}
            onClick={() => setCreateOpen(true)}
            size="small"
            variant="outline"
          >
            <RiAddLine className="size-3.5" />
            <span className="text-xs">Create project</span>
          </Button>
        </PermissionTooltip>
      </div>
      <div className="flex flex-col">
        {projects.map((project) => (
          <Link
            className="flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-ui-bg-subtle-hover"
            key={project.id}
            params={{
              organizationSlug: organizationSlug as string,
              projectSlug: project.slug,
            }}
            to="/$organizationSlug/$projectSlug"
          >
            <div className="flex size-8 items-center justify-center rounded-full bg-ui-bg-subtle shadow-buttons-neutral">
              {project.emoji ? (
                <span className="text-base">{project.emoji}</span>
              ) : (
                <RiFolder3Line className="size-4 text-ui-fg-muted" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <Text className="truncate" size="small" weight="plus">
                {project.name}
              </Text>
              <Text className="truncate text-ui-fg-muted" size="xsmall">
                {project.slug}
              </Text>
            </div>
            <Text className="text-ui-fg-muted" size="xsmall">
              {dayjs(project.createdAt).format("MMM D, YYYY")}
            </Text>
          </Link>
        ))}
      </div>
      <CreateProjectDialog
        onOpenChange={setCreateOpen}
        open={createOpen}
        organizationId={organization.id}
        organizationSlug={organizationSlug as string}
      />
    </div>
  );
}
