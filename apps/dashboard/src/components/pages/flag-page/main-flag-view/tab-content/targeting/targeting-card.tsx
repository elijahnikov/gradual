import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Input } from "@gradual/ui/input";
import { Text } from "@gradual/ui/text";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiDeleteBinLine,
  RiMore2Fill,
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
    <Card
      className={cn(
        "flex w-full max-w-2xl flex-col p-0",
        hasError && "border-destructive/50"
      )}
    >
      <div className="flex flex-col gap-2.5 p-2.5 sm:p-3">
        <div className="flex items-center gap-2">
          <Input
            className="h-7 w-full text-sm"
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Target name"
            value={name}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button className="size-7" size="small" variant="outline" />
              }
            >
              <RiMore2Fill className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={isFirst} onClick={onMoveUp}>
                <RiArrowUpLine className={cn(isFirst && "text-ui-fg-muted!")} />
                Move up
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isLast} onClick={onMoveDown}>
                <RiArrowDownLine
                  className={cn(isLast && "text-ui-fg-muted!")}
                />
                Move down
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-ui-fg-error!"
                onClick={onDelete}
              >
                <RiDeleteBinLine className="size-4 shrink-0 text-ui-fg-error! focus:text-ui-fg-error!" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

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
            label=""
            onRolloutChange={onRolloutChange}
            rollout={rollout}
            variations={variations}
          />
        )}
      </div>
    </Card>
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
