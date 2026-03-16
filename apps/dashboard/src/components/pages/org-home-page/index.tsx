import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import {
  RiAddLine,
  RiBarChartBoxLine,
  RiBookOpenLine,
  RiFolder3Line,
  RiGlobalLine,
  RiGroup2Line,
  RiHistoryLine,
  RiKeyLine,
  RiLoader4Line,
  RiPieChartLine,
  RiSettings3Line,
  RiToggleLine,
  RiUserAddLine,
} from "@remixicon/react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { Suspense, useState } from "react";
import CreateProjectDialog from "@/components/common/dialogs/create-project-dialog";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { usePlanLimits } from "@/lib/hooks/use-plan-limits";
import { useRecentlyVisited } from "@/lib/hooks/use-recently-visited";
import { useTRPC } from "@/lib/trpc";
import OrgProjects from "./org-projects";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) {
    return "Good morning";
  }
  if (hour < 17) {
    return "Good afternoon";
  }
  return "Good evening";
}

function getFirstName(name: string | null | undefined): string | null {
  if (!name) {
    return null;
  }
  return name.split(" ")[0] ?? name;
}

function formatVisitedAt(timestamp: number): string {
  const now = dayjs();
  const visited = dayjs(timestamp);
  const diffMinutes = now.diff(visited, "minute");
  const diffHours = now.diff(visited, "hour");
  const diffDays = now.diff(visited, "day");

  if (diffMinutes < 1) {
    return "just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  if (visited.year() === now.year()) {
    return visited.format("MMM D");
  }
  return visited.format("MMM D, YYYY");
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  project: RiFolder3Line,
  settings: RiSettings3Line,
  flag: RiToggleLine,
  segment: RiPieChartLine,
  flags: RiToggleLine,
  segments: RiPieChartLine,
  environments: RiGlobalLine,
  analytics: RiBarChartBoxLine,
  "audit-log": RiHistoryLine,
  "api-keys": RiKeyLine,
  "project-settings": RiSettings3Line,
};

function RecentlyVisited() {
  const { visits } = useRecentlyVisited();
  const { organizationSlug } = useParams({ strict: false });

  const orgVisits = visits.filter((v) =>
    v.path.startsWith(`/${organizationSlug}/`)
  );

  if (orgVisits.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 px-6 pb-2">
      <Text
        className="font-mono text-ui-fg-muted tracking-tight"
        size="xsmall"
        weight="plus"
      >
        Recently visited
      </Text>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {orgVisits.slice(0, 8).map((visit) => {
          const Icon = typeIcons[visit.type] ?? RiFolder3Line;
          return (
            <Link key={visit.path} to={visit.path}>
              <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-ui-bg-subtle-hover dark:bg-ui-bg-base">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Text
                    className="flex items-center gap-1.5 truncate"
                    size="xsmall"
                    weight="plus"
                  >
                    {visit.emoji ? (
                      <span className="text-sm">{visit.emoji}</span>
                    ) : (
                      <Icon className="size-3.5 shrink-0 text-ui-fg-muted" />
                    )}
                    {visit.subtitle ? (
                      <>
                        <span className="text-ui-fg-muted">
                          {visit.subtitle}
                        </span>
                        <span className="text-ui-fg-muted">/</span>
                        {visit.title}
                      </>
                    ) : (
                      visit.title
                    )}
                  </Text>
                  <Text
                    className="mt-1 font-mono text-ui-fg-muted tracking-tight"
                    size="xsmall"
                    weight="plus"
                  >
                    {formatVisitedAt(visit.visitedAt)}
                  </Text>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function QuickActions({
  organizationId,
  organizationSlug,
}: {
  organizationId: string;
  organizationSlug: string;
}) {
  const { canCreateProject } = usePermissions();
  const { canCreateProject: canCreateProjectPlan } =
    usePlanLimits(organizationId);
  const [createOpen, setCreateOpen] = useState(false);

  const projectAllowed = canCreateProject && canCreateProjectPlan;

  const actions = [
    {
      label: "New project",
      icon: RiAddLine,
      onClick: () => setCreateOpen(true),
      permission: projectAllowed,
      tooltipMessage: canCreateProjectPlan
        ? undefined
        : "You've reached the project limit for your plan. Upgrade to create more projects.",
    },
    {
      label: "Invite member",
      icon: RiUserAddLine,
      href: `/${organizationSlug}/settings?tab=members`,
    },
    {
      label: "Documentation",
      icon: RiBookOpenLine,
      externalHref: "https://docs.gradual.so",
    },
  ];

  return (
    <div className="flex flex-col gap-3 px-6 pb-1.5">
      <Text
        className="font-mono text-ui-fg-muted tracking-tight"
        size="xsmall"
        weight="plus"
      >
        Quick actions
      </Text>
      <div className="flex gap-2">
        {actions.map((action) => {
          if (action.externalHref) {
            return (
              <Button
                key={action.label}
                render={
                  // biome-ignore lint/a11y/useAnchorContent: content provided by children
                  <a
                    href={action.externalHref}
                    rel="noopener noreferrer"
                    target="_blank"
                  />
                }
                size="small"
                variant="outline"
              >
                <action.icon className="size-3.5" />
                {action.label}
              </Button>
            );
          }
          if (action.href) {
            return (
              <Button
                key={action.label}
                render={<Link to={action.href} />}
                size="small"
                variant="outline"
              >
                <action.icon className="size-3.5" />
                {action.label}
              </Button>
            );
          }
          if (action.permission !== undefined) {
            return (
              <PermissionTooltip
                hasPermission={action.permission}
                key={action.label}
                message={action.tooltipMessage}
              >
                <Button
                  disabled={!action.permission}
                  onClick={action.onClick}
                  size="small"
                  variant="outline"
                >
                  <action.icon className="size-3.5" />
                  {action.label}
                </Button>
              </PermissionTooltip>
            );
          }
          return null;
        })}
      </div>
      <CreateProjectDialog
        onOpenChange={setCreateOpen}
        open={createOpen}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
      />
    </div>
  );
}

function OrgHomeContent() {
  const trpc = useTRPC();
  const { organizationSlug } = useParams({ strict: false });

  const { data: session } = useSuspenseQuery(
    trpc.auth.getSession.queryOptions()
  );

  const { data: organization } = useSuspenseQuery(
    trpc.organization.getBySlug.queryOptions({
      organizationSlug: organizationSlug as string,
    })
  );

  const { data: overview, isLoading: isOverviewLoading } = useQuery(
    trpc.organization.getOverview.queryOptions({
      organizationId: organization.id,
    })
  );

  const firstName = getFirstName(session?.user?.name);

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-y-4 overflow-y-auto">
      <div className="flex flex-col gap-2 px-6 pt-6 pb-2">
        <h1 className="font-semibold text-2xl text-ui-fg-base">
          {getGreeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="font-mono" variant="outline">
            {organization.name}
          </Badge>
          <Badge className="font-mono" variant="secondary">
            {isOverviewLoading ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiToggleLine className="size-3" />
            )}
            {overview?.totalFlags ?? "-"} flags
          </Badge>
          <Badge className="font-mono" variant="secondary">
            {isOverviewLoading ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiBarChartBoxLine className="size-3" />
            )}
            {overview ? overview.evaluations24h.toLocaleString() : "-"} evals
            (24h)
          </Badge>
          <Badge className="font-mono" variant="secondary">
            {isOverviewLoading ? (
              <RiLoader4Line className="size-3 animate-spin" />
            ) : (
              <RiGroup2Line className="size-3" />
            )}
            {overview?.totalMembers ?? "-"} members
          </Badge>
        </div>
      </div>
      <Separator />

      <QuickActions
        organizationId={organization.id}
        organizationSlug={organizationSlug as string}
      />
      <Separator />

      <RecentlyVisited />
      <Separator />

      <OrgProjects organizationId={organization.id} />
    </div>
  );
}

function OrgHomeSkeleton() {
  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-y-4">
      {/* Greeting + stat badges */}
      <div className="flex flex-col gap-2 px-6 pt-6 pb-2">
        <Skeleton className="h-8 w-64" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
      </div>
      <Separator />

      {/* Quick actions */}
      <div className="flex flex-col gap-3 px-6 pb-1.5">
        <Skeleton className="h-3.5 w-20" />
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-8 w-28 rounded-md" key={i} />
          ))}
        </div>
      </div>
      <Separator />

      {/* Recently visited */}
      <div className="flex flex-col gap-3 px-6 pb-2">
        <Skeleton className="h-3.5 w-24" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton className="h-[60px] rounded-lg" key={i} />
          ))}
        </div>
      </div>
      <Separator />

      {/* Projects */}
      <div className="flex flex-col gap-3 px-6 pb-2">
        <Skeleton className="h-3.5 w-16" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton className="h-[72px] rounded-lg" key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function OrgHomePage() {
  return (
    <div className="flex h-full w-full flex-col">
      <Suspense fallback={<OrgHomeSkeleton />}>
        <OrgHomeContent />
      </Suspense>
    </div>
  );
}
