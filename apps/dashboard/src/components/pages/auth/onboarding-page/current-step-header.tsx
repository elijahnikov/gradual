import { Heading } from "@gradual/ui/heading";
import { Text } from "@gradual/ui/text";
import type { OnboardingStepEntry } from ".";

export const CurrentStepHeader = ({
  currentStep,
}: {
  currentStep: OnboardingStepEntry;
}) => {
  return (
    <div className="absolute -top-28 w-full text-center">
      <Heading className="text-[24px]">{currentStep.title}</Heading>
      <Text
        className="whitespace-pre-wrap text-balance text-ui-fg-muted"
        size="small"
        weight={"plus"}
      >
        {currentStep.description}
      </Text>
    </div>
  );
};
