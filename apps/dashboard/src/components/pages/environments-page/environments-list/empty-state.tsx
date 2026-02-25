import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Kbd } from "@gradual/ui/kbd";
import { Text } from "@gradual/ui/text";
import { RiServerFill } from "@remixicon/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useState } from "react";
import CreateEnvironmentDialog from "@/components/common/dialogs/create-environment-dialog";

export default function EmptyEnvironmentsList() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useHotkey("Mod+C", () => {
    setCreateDialogOpen(true);
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Card className="flex size-12 items-center justify-center">
        <RiServerFill className="size-8 shrink-0 text-ui-fg-muted" />
      </Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <Heading level="h2">No environments created yet.</Heading>
        <Text className="max-w-sm text-ui-fg-muted">
          You haven't created any environments yet. Environments let you manage
          feature flags across different stages of your workflow.
        </Text>
      </div>
      <CreateEnvironmentDialog
        onOpenChange={setCreateDialogOpen}
        open={createDialogOpen}
      >
        Create environment
        <Kbd className="text-ui-fg-base">⌘C</Kbd>
      </CreateEnvironmentDialog>
    </div>
  );
}
