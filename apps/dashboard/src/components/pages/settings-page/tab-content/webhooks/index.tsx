import { Button } from "@gradual/ui/button";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { RiAddLine } from "@remixicon/react";
import { Suspense, useState } from "react";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import WebhookFormDialog from "./webhook-form-dialog";
import WebhookList from "./webhook-list";

export default function WebhooksSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const { canManageWebhooks } = usePermissions();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b bg-ui-bg-subtle px-4 py-2">
        <Text className="text-ui-fg-muted" size="xsmall">
          Receive real-time notifications when audit log events occur
        </Text>
        <PermissionTooltip
          hasPermission={canManageWebhooks}
          message="You don't have permission to manage webhooks"
        >
          <Button
            className="gap-x-1"
            onClick={() => setCreateOpen(true)}
            size="small"
            variant="outline"
          >
            <RiAddLine className="size-3.5" />
            <span className="text-xs">Add Webhook</span>
          </Button>
        </PermissionTooltip>
      </div>
      <Suspense fallback={<WebhookListSkeleton />}>
        <WebhookList />
      </Suspense>
      <WebhookFormDialog onOpenChange={setCreateOpen} open={createOpen} />
    </div>
  );
}

function WebhookListSkeleton() {
  return (
    <div className="flex flex-col gap-y-2 px-4 py-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton className="h-16 w-full" key={index} />
      ))}
    </div>
  );
}
