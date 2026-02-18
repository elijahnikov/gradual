import CopyButton from "@gradual/ui/copy-button";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import {
  RiCalendarLine,
  RiFlagLine,
  RiKey2Fill,
  RiListCheck3,
} from "@remixicon/react";
import dayjs from "dayjs";

export default function SegmentListItemStats({
  createdAt,
  segmentKey,
  conditionCount,
  flagCount,
}: {
  createdAt: Date;
  segmentKey: string;
  conditionCount: number;
  flagCount: number;
}) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <RiKey2Fill className="size-4 text-ui-fg-muted" />
          <Text className="font-mono text-ui-fg-muted" size="xsmall">
            {segmentKey}
          </Text>
          <CopyButton className="size-4 [&_svg]:size-3!" text={segmentKey} />
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
              <RiListCheck3 className="size-4 text-ui-fg-muted" />
              <Text className="font-mono text-ui-fg-muted" size="xsmall">
                {conditionCount}
              </Text>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {conditionCount} condition{conditionCount !== 1 ? "s" : ""}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1">
              <RiFlagLine className="size-4 text-ui-fg-muted" />
              <Text className="font-mono text-ui-fg-muted" size="xsmall">
                {flagCount}
              </Text>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            Used in {flagCount} flag{flagCount !== 1 ? "s" : ""}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
