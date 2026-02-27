import { cn } from "@gradual/ui";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import {
  RiBarChartBoxLine,
  RiLineChartLine,
  RiTimeLine,
} from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import {
  type ReactNode,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  type LiveEvaluation,
  useLiveEvaluationListener,
} from "@/hooks/use-live-evaluations";
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
    <div className={cn("flex flex-col", className)}>
      <SectionHeader icon={icon} title={title} />
      <Suspense fallback={<SectionSkeleton />}>
        <div className="min-h-0 flex-1">{children}</div>
      </Suspense>
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

  const [liveEvalCount, setLiveEvalCount] = useState(0);
  const [liveFlagCounts, setLiveFlagCounts] = useState<Map<string, number>>(
    () => new Map()
  );
  const [liveVolumePoints, setLiveVolumePoints] = useState<
    { time: number; value: number }[]
  >([]);

  useLiveEvaluationListener(
    useCallback((event: LiveEvaluation) => {
      setLiveEvalCount((c) => c + 1);

      setLiveFlagCounts((prev) => {
        const next = new Map(prev);
        next.set(event.featureFlagId, (next.get(event.featureFlagId) ?? 0) + 1);
        return next;
      });

      setLiveVolumePoints((prev) => [
        ...prev,
        { time: Date.now() / 1000, value: (prev.at(-1)?.value ?? 0) + 1 },
      ]);
    }, [])
  );

  const enrichedData = useMemo(
    () => ({
      ...data,
      evaluations24h: {
        ...data.evaluations24h,
        current: data.evaluations24h.current + liveEvalCount,
      },
    }),
    [data, liveEvalCount]
  );

  const enrichedTopFlags = useMemo(
    () =>
      data.topFlags.map((f) => ({
        ...f,
        count: f.count + (liveFlagCounts.get(f.flagId) ?? 0),
      })),
    [data.topFlags, liveFlagCounts]
  );

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <HomeKpiCards data={enrichedData} />

      <Section
        className="min-h-[400px] flex-1 border-t"
        icon={RiBarChartBoxLine}
        title="Evaluation Volume (7d)"
      >
        <div className="h-full p-3">
          <HomeVolumeChart
            data={data.volumeOverTime}
            livePoints={liveVolumePoints}
          />
        </div>
      </Section>

      <div className="grid min-h-[300px] divide-x border-t sm:grid-cols-2">
        <Section icon={RiTimeLine} title="Recently Changed">
          <RecentFlags
            data={data.recentFlags}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        </Section>
        <Section icon={RiLineChartLine} title="Top Flags (24h)">
          <HomeTopFlags
            data={enrichedTopFlags}
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
          />
        </Section>
      </div>
    </div>
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
