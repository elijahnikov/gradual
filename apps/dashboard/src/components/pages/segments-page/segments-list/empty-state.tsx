import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Text } from "@gradual/ui/text";
import { RiFolder2Fill } from "@remixicon/react";
import { useState } from "react";
import CreateSegmentDialog from "@/components/common/dialogs/create-segment-dialog";

export default function EmptySegmentsList() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Card className="flex size-12 items-center justify-center">
        <RiFolder2Fill className="size-8 shrink-0 text-ui-fg-muted" />
      </Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <Heading level="h2">No segments created yet.</Heading>
        <Text className="max-w-sm text-ui-fg-muted">
          You haven't created any segments yet. Segments let you group users for
          targeted flag delivery.
        </Text>
      </div>
      <CreateSegmentDialog
        onOpenChange={setCreateDialogOpen}
        open={createDialogOpen}
      >
        Create segment
      </CreateSegmentDialog>
    </div>
  );
}
