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
  RiToggleLine,
} from "@remixicon/react";
import dayjs from "dayjs";

export default function EnvironmentListItemStats({
  createdAt,
  slug,
  totalFlags,
  enabledFlags,
}: {
  createdAt: Date;
  slug: string;
  totalFlags: number;
  enabledFlags: number;
}) {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <RiKey2Fill className="size-4 text-ui-fg-muted" />
          <Text className="font-mono text-ui-fg-muted" size="xsmall">
            {slug}
          </Text>
          <CopyButton className="size-4 [&_svg]:size-3!" text={slug} />
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
              <RiFlagLine className="size-4 text-ui-fg-muted" />
              <Text className="font-mono text-ui-fg-muted" size="xsmall">
                {totalFlags}
              </Text>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {totalFlags} flag{totalFlags !== 1 ? "s" : ""} configured
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-1">
              <RiToggleLine className="size-4 text-ui-fg-muted" />
              <Text className="font-mono text-ui-fg-muted" size="xsmall">
                {enabledFlags}
              </Text>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {enabledFlags} flag{enabledFlags !== 1 ? "s" : ""} enabled
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
