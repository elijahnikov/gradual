import type { RouterOutputs } from "@gradual/api";
import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";

export default function VariationsItem({
  variation,
}: {
  variation: RouterOutputs["featureFlags"]["getVariations"][number];
}) {
  return (
    <Card>
      <Heading level="h3">{variation.name}</Heading>
    </Card>
  );
}
