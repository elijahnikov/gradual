import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Input } from "@gradual/ui/input";
import { Text } from "@gradual/ui/text";
import { RiDeleteBinLine, RiDraggable } from "@remixicon/react";
import type { ReactNode } from "react";
import { useTargetingStore } from "./targeting-store";
import { VariationSelector } from "./variation-selector";

interface TargetingCardProps {
  targetId: string;
  name: string;
  onNameChange: (name: string) => void;
  selectedVariationId: string;
  onVariationChange: (variationId: string) => void;
  onDelete: () => void;
  children: ReactNode;
}

export default function TargetingCard({
  name,
  onNameChange,
  selectedVariationId,
  onVariationChange,
  onDelete,
  children,
}: TargetingCardProps) {
  const variations = useTargetingStore((s) => s.variations);

  return (
    <Card className="flex min-w-3xl max-w-3xl flex-col p-0">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-x-2">
          <div className="flex w-full items-center gap-2">
            <button
              className="cursor-grab text-ui-fg-muted hover:text-ui-fg-base"
              type="button"
            >
              <RiDraggable className="size-4" />
            </button>
            <Input
              className="h-7 w-full text-sm"
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Target name"
              value={name}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">{children}</div>
      </div>

      <div className="flex w-full items-center border-t pt-3">
        <div className="flex w-full items-center justify-between gap-2 px-4 pb-3">
          <Button
            className="size-6"
            onClick={onDelete}
            size="small"
            variant="destructive"
          >
            <RiDeleteBinLine className="size-4 shrink-0" />
          </Button>
          <VariationSelector
            onChange={onVariationChange}
            value={selectedVariationId}
            variations={variations}
          />
        </div>
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
