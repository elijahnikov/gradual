import { cn } from "@gradual/ui";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";

interface PermissionTooltipProps {
  hasPermission: boolean;
  message?: string;
  children: React.ReactNode;
}

export function PermissionTooltip({
  hasPermission,
  message = "You don't have permission to perform this action",
  children,
}: PermissionTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip open={hasPermission ? false : undefined}>
        <TooltipTrigger
          render={
            <div
              className={cn(
                !hasPermission &&
                  "cursor-not-allowed [&>*]:pointer-events-none [&>*]:opacity-50"
              )}
            />
          }
        >
          {children}
        </TooltipTrigger>
        {!hasPermission && <TooltipContent>{message}</TooltipContent>}
      </Tooltip>
    </TooltipProvider>
  );
}
