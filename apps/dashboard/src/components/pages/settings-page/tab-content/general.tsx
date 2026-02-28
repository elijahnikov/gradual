import { Text } from "@gradual/ui/text";
import { RiSettings3Fill } from "@remixicon/react";

export default function GeneralSettings() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ui-fg-muted">
      <RiSettings3Fill className="size-8 text-ui-fg-muted/50" />
      <Text size="small">General settings coming soon</Text>
    </div>
  );
}
