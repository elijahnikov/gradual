import { Badge } from "@gradual/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gradual/ui/table";
import { Text } from "@gradual/ui/text";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTRPC } from "@/lib/trpc";
import { useAnalyticsStore } from "../analytics-store";

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

export default function TopFlagsWidget() {
  const trpc = useTRPC();
  const organizationSlug = useAnalyticsStore((s) => s.organizationSlug);
  const projectSlug = useAnalyticsStore((s) => s.projectSlug);
  const dateRange = useAnalyticsStore((s) => s.dateRange);
  const environmentIds = useAnalyticsStore((s) => s.selectedEnvironmentIds);
  const flagIds = useAnalyticsStore((s) => s.selectedFlagIds);

  const { data } = useSuspenseQuery(
    trpc.analytics.getTopFlags.queryOptions({
      organizationSlug,
      projectSlug,
      startDate: dateRange.from,
      endDate: dateRange.to,
      environmentIds: environmentIds.length > 0 ? environmentIds : undefined,
      flagIds: flagIds.length > 0 ? flagIds : undefined,
      limit: 10,
    })
  );

  if (data.data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        No flag data available
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Flag</TableHead>
            <TableHead className="text-right">Evaluations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((flag) => (
            <TableRow key={flag.flagId}>
              <TableCell>
                <Link
                  className="flex flex-col gap-0.5"
                  params={{
                    organizationSlug,
                    projectSlug,
                    flagSlug: flag.flagKey,
                  }}
                  preload="intent"
                  search={{}}
                  to="/$organizationSlug/$projectSlug/flags/$flagSlug"
                >
                  <Text size="small" weight="plus">
                    {flag.flagName}
                  </Text>
                  <Badge className="w-fit" variant="secondary">
                    {flag.flagKey}
                  </Badge>
                </Link>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatNumber(flag.count)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
