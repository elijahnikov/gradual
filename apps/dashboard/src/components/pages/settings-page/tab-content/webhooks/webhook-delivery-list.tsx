import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { useTRPC } from "@/lib/trpc";

export default function WebhookDeliveryList({
  webhookId,
}: {
  webhookId: string;
}) {
  const trpc = useTRPC();
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });

  const { data, isLoading } = useQuery(
    trpc.webhooks.listDeliveries.queryOptions({
      organizationSlug,
      webhookId,
      limit: 20,
    })
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1 rounded-md border p-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton className="h-6 w-full" key={i} />
        ))}
      </div>
    );
  }

  if (!data?.items.length) {
    return (
      <Card className="p-3">
        <Text className="text-ui-fg-muted" size="xsmall">
          No deliveries yet
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      {data.items.map((delivery) => (
        <div
          className="flex items-center gap-x-2 border-b py-1.5"
          key={delivery.id}
        >
          <Badge
            className="font-mono text-[10px]"
            size="sm"
            variant={delivery.success ? "success" : "error"}
          >
            {delivery.responseStatus ?? "ERR"}
          </Badge>
          <Text
            className="font-medium font-mono text-ui-fg-muted"
            size="xsmall"
          >
            {delivery.eventAction}.{delivery.eventResourceType}
          </Text>
          {delivery.durationMs != null && (
            <Text className="text-ui-fg-muted" size="xsmall">
              {delivery.durationMs}ms
            </Text>
          )}
          <Text className="ml-auto text-ui-fg-muted" size="xsmall">
            {dayjs(delivery.deliveredAt).format("MMM D, HH:mm:ss")}
          </Text>
          {delivery.error && (
            <Text className="max-w-xs truncate text-ui-fg-error" size="xsmall">
              {delivery.error}
            </Text>
          )}
        </div>
      ))}
    </Card>
  );
}
