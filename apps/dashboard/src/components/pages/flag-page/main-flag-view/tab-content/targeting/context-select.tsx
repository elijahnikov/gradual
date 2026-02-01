import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import {
  RiBuilding2Line,
  RiComputerLine,
  RiMapPinLine,
  RiUser3Line,
} from "@remixicon/react";
import type { ContextKind } from "./types";

const CONTEXT_OPTIONS: Array<{
  value: ContextKind;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: "user", label: "User", icon: RiUser3Line },
  { value: "device", label: "Device", icon: RiComputerLine },
  { value: "organization", label: "Organization", icon: RiBuilding2Line },
  { value: "location", label: "Location", icon: RiMapPinLine },
];

interface ContextSelectProps {
  value: ContextKind | undefined;
  onChange: (kind: ContextKind) => void;
}

export function ContextSelect({ value, onChange }: ContextSelectProps) {
  const selectedContext = CONTEXT_OPTIONS.find((c) => c.value === value);
  const Icon = selectedContext?.icon;

  return (
    <Select
      items={CONTEXT_OPTIONS}
      onValueChange={(val) => {
        if (val) {
          onChange(val as ContextKind);
        }
      }}
      value={value}
    >
      <SelectTrigger className="h-7.5 w-full sm:w-32">
        <span className="flex w-full items-center gap-1.5">
          {Icon && <Icon className="size-3.5 text-ui-fg-muted" />}
          <SelectValue>
            {value ? selectedContext?.label : "Context"}
          </SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {CONTEXT_OPTIONS.map((option) => {
          const ItemIcon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                <ItemIcon className="size-4 text-ui-fg-muted" />
                {option.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
