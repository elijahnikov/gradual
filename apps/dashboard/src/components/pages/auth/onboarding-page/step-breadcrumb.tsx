import { cn } from "@gradual/ui";

interface StepBreadcrumbProps {
  totalSteps: number;
  currentStep: number;
}

export function StepBreadcrumb({
  totalSteps,
  currentStep,
}: StepBreadcrumbProps) {
  return (
    <div className="absolute bottom-0 left-1/2 mb-6 flex w-full -translate-x-1/2 items-center justify-center gap-2">
      {Array.from({ length: totalSteps }, (_, index) => (
        <div
          className={cn(
            "size-2.5 rounded-full border bg-ui-bg-component-pressed dark:bg-ui-bg-field/50",
            index === currentStep && "border-0 bg-blue-500!"
          )}
          key={index}
        />
      ))}
    </div>
  );
}
