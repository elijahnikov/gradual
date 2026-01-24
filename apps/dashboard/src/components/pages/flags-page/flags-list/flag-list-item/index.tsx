import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import { RiUserSmileLine } from "@remixicon/react";
import EvaluationsPreviewChart from "./evaluations-chart";
import FlagListItemStats from "./stats";

type FlagListItemData =
  RouterOutputs["featureFlags"]["getAll"]["items"][number];

export default function FlagListItem({ flag }: { flag: FlagListItemData }) {
  const { featureFlag, maintainer, evaluationCount } = flag;

  return (
    <div className="flex h-16 items-center px-4">
      <div className="flex flex-col gap-y-0.5">
        <Text className="text-[14px]" weight="plus">
          {featureFlag.name}
        </Text>
        <FlagListItemStats
          createdAt={featureFlag.createdAt}
          evaluationCount={evaluationCount}
          flagKey={featureFlag.key}
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="p-2">
          <EvaluationsPreviewChart
            flagId={featureFlag.id}
            organizationId={featureFlag.organizationId}
            projectId={featureFlag.projectId}
          />
        </div>

        {maintainer ? (
          <Avatar className="shadow-buttons-neutral">
            <AvatarImage src={maintainer?.image ?? undefined} />
            <AvatarFallback>{maintainer?.name?.charAt(0)}</AvatarFallback>
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
