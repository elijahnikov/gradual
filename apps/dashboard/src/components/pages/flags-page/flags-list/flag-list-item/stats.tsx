import CopyButton from "@gradual/ui/copy-button";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { RiCalendarLine, RiKeyFill, RiPulseFill } from "@remixicon/react";
import dayjs from "dayjs";

export default function FlagListItemStats({
  createdAt,
  evaluationCount,
  flagKey,
}: {
  createdAt: Date;
  evaluationCount: number;
  flagKey: string;
}) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <RiKeyFill className="size-4 text-ui-fg-muted" />
          <Text className="font-mono text-ui-fg-muted" size="xsmall">
            {flagKey}
          </Text>
          <CopyButton className="size-4 [&_svg]:size-3!" text={flagKey} />
        </div>

        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1">
              <RiCalendarLine className="size-4 text-ui-fg-muted" />
              <Text className="font-mono text-ui-fg-muted" size="xsmall">
                {dayjs(createdAt).format("MMM D")}
              </Text>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Created on {dayjs(createdAt).format("MMMM D, YYYY")}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1">
              <RiPulseFill className="size-4 text-ui-fg-muted" />
              <Text className="font-mono text-ui-fg-muted" size="xsmall">
                {evaluationCount?.toLocaleString()}
              </Text>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {evaluationCount?.toLocaleString()} total evaluations
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
