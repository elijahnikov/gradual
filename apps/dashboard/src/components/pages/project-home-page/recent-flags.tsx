import { Badge } from "@gradual/ui/badge";
import { Text } from "@gradual/ui/text";
import { Link } from "@tanstack/react-router";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentFlags({
  organizationSlug,
  projectSlug,
  data,
}: {
  organizationSlug: string;
  projectSlug: string;
  data: { id: string; name: string; key: string; updatedAt: Date }[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        <Text size="small">No flags yet</Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {data.map((flag) => (
        <Link
          className="flex items-center justify-between border-b px-4 py-2.5 last:border-b-0 hover:bg-ui-bg-subtle-hover"
          key={flag.id}
          params={{
            organizationSlug,
            projectSlug,
            flagSlug: flag.key,
          }}
          preload="intent"
          search={{}}
          to="/$organizationSlug/$projectSlug/flags/$flagSlug"
        >
          <div className="flex items-center gap-2">
            <Text size="small" weight="plus">
              {flag.name}
            </Text>
            <Badge variant="secondary">{flag.key}</Badge>
          </div>
          <Text className="text-ui-fg-muted" size="xsmall">
            {timeAgo(new Date(flag.updatedAt))}
          </Text>
        </Link>
      ))}
    </div>
  );
}
