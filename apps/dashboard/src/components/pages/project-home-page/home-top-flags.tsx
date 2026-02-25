import { Badge } from "@gradual/ui/badge";
import { Text } from "@gradual/ui/text";
import { Link } from "@tanstack/react-router";

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return String(value);
}

export default function HomeTopFlags({
  organizationSlug,
  projectSlug,
  data,
}: {
  organizationSlug: string;
  projectSlug: string;
  data: { flagId: string; flagName: string; flagKey: string; count: number }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        <Text size="small">No evaluations in the last 24h</Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {data.map((flag) => (
        <Link
          className="flex items-center justify-between border-b px-4 py-2.5 last:border-b-0 hover:bg-ui-bg-subtle-hover"
          key={flag.flagId}
          params={{
            organizationSlug,
            projectSlug,
            flagSlug: flag.flagKey,
          }}
          preload="intent"
          search={{}}
          to="/$organizationSlug/$projectSlug/flags/$flagSlug"
        >
          <div className="flex items-center gap-2">
            <Text size="small" weight="plus">
              {flag.flagName}
            </Text>
            <Badge variant="secondary">{flag.flagKey}</Badge>
          </div>
          <Text className="font-mono text-ui-fg-muted" size="xsmall">
            {formatNumber(flag.count)}
          </Text>
        </Link>
      ))}
    </div>
  );
}
