import { Text } from "@gradual/ui/text";
import { RiPlugLine } from "@remixicon/react";

export default function IntegrationsSettings() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ui-fg-muted">
      <RiPlugLine className="size-8 text-ui-fg-muted/50" />
      <Text size="small">Integrations coming soon</Text>
    </div>
  );
}
