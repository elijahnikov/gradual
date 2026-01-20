import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@gradual/ui/breadcrumb";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { useTRPC } from "@/lib/trpc";

const segmentMap: Record<string, string> = {
  flags: "Flags",
  audiences: "Audiences",
  environments: "Environments",
  analytics: "Analytics",
  "audit-log": "Audit Log",
  api: "API Keys",
  settings: "Settings",
};

export default function ProjectBreadcrumbs() {
  const params = useParams({ strict: false });
  const organizationSlug = params.organizationSlug as string;
  const projectSlug = params.projectSlug as string;

  const trpc = useTRPC();
  const { data: project } = useSuspenseQuery(
    trpc.project.getBySlug.queryOptions({
      slug: projectSlug,
      organizationSlug,
    })
  );

  const pathname = useLocation({ select: (location) => location.pathname });

  const currentSegment = useMemo(() => {
    if (!organizationSlug) {
      return null;
    }
    if (!projectSlug) {
      return null;
    }

    const projectBasePath = `/${organizationSlug}/${projectSlug}`;
    const projectBasePathWithSlash = `${projectBasePath}/`;

    if (pathname === projectBasePath) {
      return null;
    }
    if (pathname === projectBasePathWithSlash) {
      return null;
    }

    if (pathname.startsWith(projectBasePathWithSlash)) {
      const segment = pathname
        .replace(projectBasePathWithSlash, "")
        .split("/")[0];
      return segment;
    }

    return null;
  }, [pathname, organizationSlug, projectSlug]);

  const segmentDisplayName = useMemo(() => {
    if (!currentSegment) {
      return null;
    }
    const mapped = segmentMap[currentSegment];
    if (mapped) {
      return mapped;
    }
    return currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1);
  }, [currentSegment]);

  return (
    <Breadcrumb className="sticky top-0 z-50 flex h-10 w-full items-center border-b bg-ui-bg-base px-2.5">
      <BreadcrumbList>
        <BreadcrumbItem className="font-medium text-sm">
          <BreadcrumbLink
            render={
              <Link
                params={{ organizationSlug, projectSlug }}
                to="/$organizationSlug/$projectSlug"
              />
            }
          >
            {project.name}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segmentDisplayName && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem className="font-medium text-sm">
              <BreadcrumbPage>{segmentDisplayName}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
