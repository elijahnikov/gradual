import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { RiArrowLeftSLine } from "@remixicon/react";

export default function Breadcrumb({
  steps,
  currentStepIndex,
}: {
  steps: number;
  currentStepIndex: number;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 mb-6 flex w-full -translate-x-1/2 items-center justify-center gap-2">
      <Button className="size-6" size="small" variant="ghost">
        <RiArrowLeftSLine className="size-4 shrink-0" />
      </Button>
      {Array.from({ length: steps }).map((_, index) => (
        <div
          className={cn("size-2 rounded-full border bg-ui-bg-field/50", {
            "bg-blue-500": index === currentStepIndex,
          })}
          key={index}
        />
      ))}
    </div>
  );
}
