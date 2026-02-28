import { Text } from "@gradual/ui/text";
import { RiNotification3Fill } from "@remixicon/react";

export default function NotificationsSettings() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ui-fg-muted">
      <RiNotification3Fill className="size-8 text-ui-fg-muted/50" />
      <Text size="small">Notifications coming soon</Text>
    </div>
  );
}
