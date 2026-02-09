import { Button } from "@gradual/ui/button";
import { LoadingButton } from "@gradual/ui/loading-button";

interface StepActionsProps {
  onContinue: () => void;
  onSkip?: () => void;
  isLoading?: boolean;
  continueLabel?: string;
  skipLabel?: string;
  continueDisabled?: boolean;
  type?: "button" | "submit";
}

export function StepActions({
  onContinue,
  onSkip,
  isLoading = false,
  continueLabel = "Continue",
  skipLabel = "Skip",
  continueDisabled = false,
  type = "button",
}: StepActionsProps) {
  return (
    <div className="flex w-full gap-2 pt-6">
      {onSkip && (
        <Button
          className="whitespace-nowrap"
          disabled={isLoading}
          onClick={onSkip}
          type="button"
          variant="outline"
        >
          {skipLabel}
        </Button>
      )}
      <LoadingButton
        className="w-full text-[13px]"
        disabled={continueDisabled || isLoading}
        loading={isLoading}
        onClick={type === "button" ? onContinue : undefined}
        type={type}
        variant="gradual"
      >
        {continueLabel}
      </LoadingButton>
    </div>
  );
}
