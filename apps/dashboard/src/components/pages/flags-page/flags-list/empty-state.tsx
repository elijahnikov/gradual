import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Kbd } from "@gradual/ui/kbd";
import { Text } from "@gradual/ui/text";
import { RiFlagOffFill } from "@remixicon/react";
import CreateFlagDialog from "@/components/common/dialogs/create-flag-dialog";

export default function EmptyFlagsList() {
  return (
    <div className="relative flex h-full min-h-[80vh] w-full items-center justify-center">
      <div className="absolute top-1/2 left-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-70" />
      <div className="absolute top-1/2 left-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-50" />
      <div className="absolute top-1/2 left-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-30" />
      <div className="absolute top-1/2 left-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-10" />
      <div className="flex flex-col items-center justify-center gap-2">
        <Card className="absolute top-1/2 left-1/2 z-50! flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
          <RiFlagOffFill className="size-8 shrink-0 text-ui-fg-subtle" />
        </Card>
        <div className="relative top-24 flex flex-col items-center justify-center">
          <Heading>No feature flags created yet.</Heading>
          <Text className="text-ui-fg-muted" weight="plus">
            You haven't created any feature flags yet. Let's change that.
          </Text>
          <div className="h-4" />
          <CreateFlagDialog>
            Create flag
            <Badge className="bg-white px-0.5">
              <Kbd>⌘J</Kbd>
            </Badge>
          </CreateFlagDialog>
        </div>
      </div>
    </div>
  );
}
