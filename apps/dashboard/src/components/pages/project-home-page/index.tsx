import { cn } from "@gradual/ui";
import { Card } from "@gradual/ui/card";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import {
  RiBarChartBoxLine,
  RiLineChartLine,
  RiTimeLine,
} from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { type ReactNode, Suspense } from "react";
import { useTRPC } from "@/lib/trpc";
import HomeKpiCards from "./home-kpi-cards";
import HomeTopFlags from "./home-top-flags";
import HomeVolumeChart from "./home-volume-chart";
import RecentFlags from "./recent-flags";

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b bg-ui-bg-subtle px-4 py-3">
      <Icon className="size-4 shrink-0 text-ui-fg-muted" />
      <Text size="small" weight="plus">
        {title}
      </Text>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="p-4">
      <Skeleton className="h-full min-h-[150px] w-full rounded-md" />
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      <SectionHeader icon={icon} title={title} />
      <Suspense fallback={<SectionSkeleton />}>{children}</Suspense>
    </div>
  );
}

function HomeContent({
  organizationSlug,
  projectSlug,
}: {
  organizationSlug: string;
  projectSlug: string;
}) {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.project.getHomeSummary.queryOptions({
      organizationSlug,
      projectSlug,
    })
  );

  return (
    <>
      <HomeKpiCards data={data} />

      <Section
        className="border-t"
        icon={RiBarChartBoxLine}
        title="Evaluation Volume (7d)"
      >
        <div className="p-3">
          <Card>
            <div className="flex h-[300px] items-center px-3 py-3">
              <HomeVolumeChart data={data.volumeOverTime} />
            </div>
          </Card>
        </div>
      </Section>

      <div className="grid min-h-0 flex-1 divide-x border-t sm:grid-cols-2">
        <Section icon={RiTimeLine} title="Recently Changed">
          <RecentFlags
            data={data.recentFlags}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        </Section>
        <Section icon={RiLineChartLine} title="Top Flags (24h)">
          <HomeTopFlags
            data={data.topFlags}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        </Section>
      </div>
    </>
  );
}

export default function ProjectHomePageComponent() {
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/",
  });

  return (
    <div className="flex h-[calc(100vh-3.4rem)] min-h-[calc(100vh-3.4rem)] w-full flex-col">
      <Suspense
        fallback={
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        }
      >
        <HomeContent
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
        />
      </Suspense>
    </div>
  );
}
