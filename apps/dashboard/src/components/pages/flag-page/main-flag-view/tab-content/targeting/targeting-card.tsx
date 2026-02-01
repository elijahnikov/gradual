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
import { useTargetingStore } from "./targeting-store";
import { VariationSelector } from "./variation-selector";

interface TargetingCardProps {
  targetId: string;
  name: string;
  onNameChange: (name: string) => void;
  selectedVariationId: string;
  onVariationChange: (variationId: string) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  children: ReactNode;
}

export default function TargetingCard({
  name,
  onNameChange,
  selectedVariationId,
  onVariationChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  children,
}: TargetingCardProps) {
  const variations = useTargetingStore((s) => s.variations);

  return (
    <Card className="flex w-full max-w-3xl flex-col p-0">
      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-x-2">
          <div className="flex w-full items-center gap-2">
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
        <div className="flex w-full flex-col gap-3 px-3 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-4">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button className="size-6" size="small" variant="outline" />
                }
              >
                <RiMore2Fill className="size-4 shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem disabled={isFirst} onClick={onMoveUp}>
                  <RiArrowUpLine
                    className={cn(isFirst && "text-ui-fg-muted!")}
                  />
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
