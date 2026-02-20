import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Input } from "@gradual/ui/input";
import { Text } from "@gradual/ui/text";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import type { ReactNode } from "react";
import { GradualRolloutEditor } from "./gradual-rollout-editor";
import { RolloutEditor } from "./rollout-editor";
import type { LocalRollout } from "./targeting-store";
import { useTargetingStore } from "./targeting-store";
import { VariationSelector } from "./variation-selector";

interface TargetingCardProps {
  name: string;
  onNameChange: (name: string) => void;
  selectedVariationId?: string;
  rollout?: LocalRollout;
  onVariationChange: (variationId: string) => void;
  onRolloutChange: (rollout: LocalRollout) => void;
  onModeChange: (mode: "single" | "rollout" | "gradual") => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  hasError?: boolean;
  children: ReactNode;
}

export default function TargetingCard({
  name,
  onNameChange,
  selectedVariationId,
  rollout,
  onVariationChange,
  onRolloutChange,
  onModeChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  hasError,
  children,
}: TargetingCardProps) {
  const variations = useTargetingStore((s) => s.variations);
  const defaultVariationId = useTargetingStore((s) => s.defaultVariationId);

  const isGradual = !!rollout?.schedule;
  const isRollout = !!rollout && !isGradual;
  const effectiveVariationId =
    selectedVariationId ?? defaultVariationId ?? variations[0]?.id ?? "";

  return (
    <div className="group/card relative flex w-full max-w-2xl justify-center">
      <Card
        className={cn(
          "flex w-full flex-col p-0",
          hasError && "border-destructive/50"
        )}
      >
        <div className="flex flex-col gap-2.5 p-2.5 sm:p-3">
          <Input
            className="h-7 w-full text-sm"
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Target name"
            value={name}
          />

          <div className="flex flex-col gap-2">{children}</div>
        </div>

        <div className="flex w-full flex-col border-t">
          <div className="flex w-full flex-col gap-2.5 px-2.5 py-2.5 sm:px-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
              <VariationSelector
                isGradual={isGradual}
                isRollout={isRollout}
                label="Serve"
                onChange={onVariationChange}
                onGradualSelect={() => onModeChange("gradual")}
                onRolloutSelect={() => onModeChange("rollout")}
                value={effectiveVariationId}
                variations={variations}
              />
            </div>
          </div>
          {isGradual && rollout && (
            <GradualRolloutEditor
              onRolloutChange={onRolloutChange}
              rollout={rollout}
              variations={variations}
            />
          )}
          {isRollout && rollout && (
            <RolloutEditor
              onRolloutChange={onRolloutChange}
              rollout={rollout}
              variations={variations}
            />
          )}
        </div>
      </Card>

      <div className="absolute top-1 right-0 hidden translate-x-full flex-col gap-1 pl-2 opacity-0 transition-opacity group-hover/card:opacity-100 sm:flex">
        <Button
          className="size-6"
          disabled={isFirst}
          onClick={onMoveUp}
          size="small"
          variant="default"
        >
          <RiArrowUpLine className="size-3.5 shrink-0" />
        </Button>
        <Button
          className="size-6"
          disabled={isLast}
          onClick={onMoveDown}
          size="small"
          variant="default"
        >
          <RiArrowDownLine className="size-3.5 shrink-0" />
        </Button>
        <Button
          className="size-6"
          onClick={onDelete}
          size="small"
          variant="default"
        >
          <RiDeleteBinLine className="size-3.5 shrink-0 text-ui-fg-error" />
        </Button>
      </div>
    </div>
  );
}

interface TargetingCardHeaderProps {
  title: string;
  description?: string;
}

export function TargetingCardHeader({
  title,
  description,
}: TargetingCardHeaderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <Text size="small" weight="plus">
        {title}
      </Text>
      {description && (
        <Text className="text-ui-fg-subtle" size="xsmall">
          {description}
        </Text>
      )}
    </div>
  );
}
