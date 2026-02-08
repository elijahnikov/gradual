import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Text } from "@gradual/ui/text";
import { RiNotificationOffFill } from "@remixicon/react";

export default function EmptyEventsList() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Card className="flex size-12 items-center justify-center">
        <RiNotificationOffFill className="size-8 shrink-0 text-ui-fg-muted" />
      </Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <Heading level="h2">No events have been captured yet.</Heading>
        <Text className="max-w-sm text-ui-fg-muted">
          Evaluations will appear here in realtime when captured
        </Text>
      </div>
    </div>
  );
}
