import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@gradual/ui/breadcrumb";
import { Skeleton } from "@gradual/ui/skeleton";
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
  const flagSlug = params.flagSlug as string | undefined;

  const trpc = useTRPC();
  const { data: breadcrumbs } = useSuspenseQuery(
    trpc.project.getBreadcrumbs.queryOptions({
      organizationSlug,
      projectSlug,
      flagSlug,
    })
  );

  const pathname = useLocation({ select: (location) => location.pathname });

  const isFlagDetailPage = useMemo(() => {
    return Boolean(
      flagSlug &&
        organizationSlug &&
        projectSlug &&
        pathname.includes(
          `/${organizationSlug}/${projectSlug}/flags/${flagSlug}`
        )
    );
  }, [pathname, organizationSlug, projectSlug, flagSlug]);

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
    <Breadcrumb className="sticky top-0 z-50 flex h-9 w-full items-center border-b bg-ui-bg-base px-2.5">
      <BreadcrumbList>
        <BreadcrumbItem className="rounded-[4px] px-1 py-0.5 font-medium text-sm hover:bg-ui-bg-subtle">
          <BreadcrumbLink
            render={
              <Link
                params={{ organizationSlug, projectSlug }}
                search={{}}
                to="/$organizationSlug/$projectSlug"
              />
            }
          >
            {breadcrumbs.projectName}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segmentDisplayName && (
          <>
            <BreadcrumbSeparator />
            {isFlagDetailPage && breadcrumbs.flagName ? (
              <>
                <BreadcrumbItem className="rounded-[4px] px-1 py-0.5 font-medium text-sm hover:bg-ui-bg-subtle">
                  <BreadcrumbLink
                    render={
                      <Link
                        params={{ organizationSlug, projectSlug }}
                        search={{}}
                        to="/$organizationSlug/$projectSlug/flags"
                      />
                    }
                  >
                    {segmentDisplayName}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem className="px-1 py-0.5 font-medium text-sm">
                  <BreadcrumbPage>{breadcrumbs.flagName}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem className="px-1 py-0.5 font-medium text-sm">
                <BreadcrumbPage>{segmentDisplayName}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function ProjectBreadcrumbsSkeleton() {
  return (
    <Breadcrumb className="sticky top-0 z-50 flex h-9 w-full items-center border-b bg-ui-bg-base px-1.5">
      <Skeleton className="h-6 w-full" />
    </Breadcrumb>
  );
}
