import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Kbd } from "@gradual/ui/kbd";
import { Text } from "@gradual/ui/text";
import { RiFlagOffFill } from "@remixicon/react";
import CreateFlagDialog from "@/components/common/dialogs/create-flag-dialog";

export default function EmptyFlagsList() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Card className="flex size-12 items-center justify-center">
        <RiFlagOffFill className="size-8 shrink-0 text-ui-fg-muted" />
      </Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <Heading level="h2">No feature flags created yet.</Heading>
        <Text className="max-w-sm text-ui-fg-muted">
          You haven't created any feature flags yet. Let's change that.
        </Text>
      </div>
      <CreateFlagDialog>
        Create flag
        <Badge className="bg-white px-0.5">
          <Kbd>⌘J</Kbd>
        </Badge>
      </CreateFlagDialog>
    </div>
  );
}
