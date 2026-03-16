import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import { RiFolder3Line } from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { useTRPC } from "@/lib/trpc";

export default function OrgProjects({
  organizationId,
}: {
  organizationId: string;
}) {
  const trpc = useTRPC();
  const { organizationSlug } = useParams({ strict: false });

  const { data: projects } = useSuspenseQuery(
    trpc.project.getAllByOrganizationId.queryOptions({
      organizationId,
    })
  );

  return (
    <div className="mt-2 flex flex-col gap-3 px-6 pb-4">
      <Text
        className="font-mono text-ui-fg-muted tracking-tight"
        size="xsmall"
        weight="plus"
      >
        Projects
      </Text>

      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            params={{
              organizationSlug: organizationSlug as string,
              projectSlug: project.slug,
            }}
            to="/$organizationSlug/$projectSlug"
          >
            <Card className="flex items-center gap-2 p-3 transition-colors hover:bg-ui-bg-subtle-hover dark:bg-ui-bg-base">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ui-bg-subtle shadow-buttons-neutral">
                {project.emoji ? (
                  <span className="text-lg">{project.emoji}</span>
                ) : (
                  <RiFolder3Line className="size-4 shrink-0 text-ui-fg-muted" />
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
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
