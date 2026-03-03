import { cn } from "@gradual/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import type { ComponentProps } from "react";

interface PermissionTooltipProps {
  hasPermission: boolean;
  message?: string;
  children: React.ReactNode;
  side?: ComponentProps<typeof TooltipContent>["side"];
}

export function PermissionTooltip({
  hasPermission,
  message = "You don't have permission to perform this action",
  children,
  side,
}: PermissionTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip open={hasPermission ? false : undefined}>
        <TooltipTrigger
          render={
            <div
              className={cn(
                "w-max",
                !hasPermission &&
                  "cursor-not-allowed *:pointer-events-none *:opacity-50"
              )}
            />
          }
        >
          {children}
        </TooltipTrigger>
        {!hasPermission && (
          <TooltipContent side={side}>{message}</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}
