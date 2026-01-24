import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Badge } from "@gradual/ui/badge";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import { RiUserSmileLine } from "@remixicon/react";
import dayjs from "dayjs";
import EvaluationsPreviewChart from "./evaluations-chart";

export default function FlagListItem({
  flag,
}: {
  flag: RouterOutputs["featureFlags"]["getAll"]["data"][number];
}) {
  return (
    <div className="flex h-14 items-center px-4">
      <div className="flex flex-col">
        <Text weight="plus">{flag.name}</Text>
        <Text className="font-mono text-ui-fg-muted" size="xsmall">
          {flag.key}
        </Text>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="p-2">
          <EvaluationsPreviewChart
            flagId={flag.id}
            organizationId={flag.organizationId}
            projectId={flag.projectId}
          />
        </div>
        <Badge variant="secondary">
          <Text size="xsmall" weight="plus">
            {dayjs(flag.createdAt).format("MMM D")}
          </Text>
        </Badge>
        {flag.maintainer ? (
          <Avatar className="shadow-buttons-neutral">
            <AvatarImage src={flag.maintainer?.image ?? undefined} />
            <AvatarFallback>{flag.maintainer?.name?.charAt(0)}</AvatarFallback>
          </Avatar>
        ) : (
          <Card className="flex size-8 items-center justify-center rounded-full">
            <RiUserSmileLine className="size-5 shrink-0 text-ui-fg-muted/50" />
          </Card>
        )}
      </div>
    </div>
  );
}
