import { cn } from "@gradual/ui";
import { Separator } from "@gradual/ui/separator";
import type { ReactNode } from "react";
import AddNewTargetButton from "./add-new-target-button";
import type { TargetType } from "./types";

interface TargetingListProps {
  children: ReactNode[];
  onAddTarget: (type: TargetType, index: number) => void;
  footer: ReactNode;
  disabled?: boolean;
}

export function TargetingList({
  children,
  onAddTarget,
  footer,
  disabled = false,
}: TargetingListProps) {
  return (
    <div className="flex w-full flex-col items-center py-4 sm:py-8">
      <AddNewTargetButton
        disabled={disabled}
        onAddTarget={(type) => onAddTarget(type, 0)}
      />
      <TargetConnector />

      {children.map((child, index) => (
        <div className="flex w-full flex-col items-center" key={index}>
          <div
            className={cn(
              "flex w-full justify-center",
              disabled && "pointer-events-none"
            )}
          >
            {child}
          </div>
          <TargetConnector />
          <AddNewTargetButton
            disabled={disabled}
            onAddTarget={(type) => onAddTarget(type, index + 1)}
          />
          <TargetConnector />
        </div>
      ))}

      <div
        className={cn(
          "flex w-full justify-center",
          disabled && "pointer-events-none"
        )}
      >
        {footer}
      </div>
    </div>
  );
}

function TargetConnector() {
  return (
    <Separator
      className="h-8 border-[0.5px] border-ui-fg-muted/75"
      orientation="vertical"
    />
  );
}
