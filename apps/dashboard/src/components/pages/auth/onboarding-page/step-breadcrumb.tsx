import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { LoadingButton } from "@gradual/ui/loading-button";
import { useOnboardingPreviewStore } from "@/lib/stores/onboarding-preview-store";

interface StepFooterProps {
  totalSteps: number;
  currentStep: number;
  skippable: boolean;
  onSkip: () => void;
  formId?: string;
  onContinue?: () => void;
  continueLabel?: string;
}

export function StepFooter({
  totalSteps,
  currentStep,
  skippable,
  onSkip,
  formId,
  onContinue,
  continueLabel = "Continue",
}: StepFooterProps) {
  const stepCanContinue = useOnboardingPreviewStore((s) => s.stepCanContinue);
  const stepIsSubmitting = useOnboardingPreviewStore((s) => s.stepIsSubmitting);

  return (
    <div className="flex h-12 w-full shrink-0 items-center justify-between border-t bg-ui-bg-base px-4">
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            className={cn(
              "size-2 rounded-full bg-ui-bg-component-pressed transition-colors duration-300 dark:bg-ui-bg-field/50",
              index === currentStep && "bg-blue-500!"
            )}
            key={index}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {skippable && (
          <Button
            disabled={stepIsSubmitting}
            onClick={onSkip}
            size="small"
            type="button"
            variant="outline"
          >
            Skip
          </Button>
        )}
        {formId ? (
          <LoadingButton
            disabled={!stepCanContinue}
            form={formId}
            loading={stepIsSubmitting}
            size="small"
            type="submit"
            variant="gradual"
          >
            {continueLabel}
          </LoadingButton>
        ) : (
          <LoadingButton
            disabled={!stepCanContinue}
            loading={stepIsSubmitting}
            onClick={onContinue}
            size="small"
            type="button"
            variant="gradual"
          >
            {continueLabel}
          </LoadingButton>
        )}
      </div>
    </div>
  );
}
