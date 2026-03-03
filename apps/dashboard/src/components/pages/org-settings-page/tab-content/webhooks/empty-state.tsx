import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Text } from "@gradual/ui/text";
import { RiWebhookLine } from "@remixicon/react";

export default function EmptyWebhooksList() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Card className="flex size-12 items-center justify-center">
        <RiWebhookLine className="size-8 shrink-0 text-ui-fg-muted" />
      </Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <Heading level="h2">No webhooks configured yet.</Heading>
        <Text className="max-w-sm text-ui-fg-muted">
          Add a webhook to receive real-time notifications when audit log events
          occur.
        </Text>
      </div>
    </div>
  );
}
