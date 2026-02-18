import { cn } from "@gradual/ui";
import { Separator } from "@gradual/ui/separator";
import { type ReactNode, useEffect, useState } from "react";
import AddNewTargetButton from "./add-new-target-button";
import type { TargetType } from "./types";

interface TargetingListProps {
  children: ReactNode[];
  onAddTarget: (type: TargetType, index: number) => void;
  footer: ReactNode;
  disabled?: boolean;
  collapsed?: boolean;
}

export function TargetingList({
  children,
  onAddTarget,
  footer,
  disabled = false,
  collapsed = false,
}: TargetingListProps) {
  const [canAnimate, setCanAnimate] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setCanAnimate(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="flex w-full flex-col items-center py-3 sm:py-5">
      <div
        className={cn(
          "grid w-full",
          canAnimate &&
            "transition-[grid-template-rows] duration-300 ease-in-out",
          collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        )}
      >
        <div className="flex w-full flex-col items-center overflow-hidden pt-1">
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
        </div>
      </div>

      <div className="flex w-full justify-center">{footer}</div>
    </div>
  );
}

function TargetConnector() {
  return (
    <Separator
      className="h-5 border-[0.5px] border-ui-fg-muted/75"
      orientation="vertical"
    />
  );
}
