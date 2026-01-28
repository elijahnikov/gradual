import { Separator } from "@gradual/ui/separator";
import type { ReactNode } from "react";
import AddNewTargetButton from "./add-new-target-button";
import type { TargetType } from "./types";

interface TargetingListProps {
  children: ReactNode[];
  onAddTarget: (type: TargetType, index: number) => void;
  footer: ReactNode;
}

export function TargetingList({
  children,
  onAddTarget,
  footer,
}: TargetingListProps) {
  return (
    <div className="flex flex-col items-center py-8">
      <AddNewTargetButton onAddTarget={(type) => onAddTarget(type, 0)} />
      <TargetConnector />

      {children.map((child, index) => (
        <div className="flex flex-col items-center" key={index}>
          {child}
          <TargetConnector />
          <AddNewTargetButton
            onAddTarget={(type) => onAddTarget(type, index + 1)}
          />
          <TargetConnector />
        </div>
      ))}

      {footer}
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
