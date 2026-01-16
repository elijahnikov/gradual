import { Heading } from "@gradual/ui/heading";
import { Text } from "@gradual/ui/text";

interface CurrentStepHeaderProps {
  title: string;
  description: string;
}

export function CurrentStepHeader({
  title,
  description,
}: CurrentStepHeaderProps) {
  return (
    <div className="absolute top-12 left-0 w-1/2 translate-x-1/2 text-center">
      <Heading className="text-[24px]">{title}</Heading>
      <Text
        className="whitespace-pre-wrap text-balance text-ui-fg-muted"
        size="small"
        weight="plus"
      >
        {description}
      </Text>
    </div>
  );
}
