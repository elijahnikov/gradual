import { ENVIRONMENT_COLORS } from "@gradual/api/utils";
import { cn } from "@gradual/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@gradual/ui/popover";
import { RiCheckLine } from "@remixicon/react";
import { useState } from "react";

interface EnvironmentColorPickerProps {
  value?: string;
  onChange?: (color: string) => void;
  size?: "small" | "medium" | "large";
}

export default function EnvironmentColorPicker({
  value,
  onChange,
  size = "medium",
}: EnvironmentColorPickerProps) {
  const [open, setOpen] = useState(false);

  const sizeClasses = {
    large: { trigger: "size-12", swatch: "size-8" },
    medium: { trigger: "size-8", swatch: "size-6" },
    small: { trigger: "size-6", swatch: "size-4" },
  };

  const handleSelect = (color: string) => {
    onChange?.(color);
    setOpen(false);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <button
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-field transition-all hover:bg-ui-bg-field-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-fg-interactive",
              sizeClasses[size].trigger
            )}
            type="button"
          />
        }
      >
        {value ? (
          <span
            className={cn("rounded-full", sizeClasses[size].swatch)}
            style={{ backgroundColor: value }}
          />
        ) : (
          <span className="text-ui-fg-muted text-xs">+</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {ENVIRONMENT_COLORS.map((color) => {
            const isSelected = value === color.value;
            return (
              <button
                className={cn(
                  "relative flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-fg-interactive focus-visible:ring-offset-2",
                  isSelected && "ring-2 ring-ui-fg-base ring-offset-2"
                )}
                key={color.value}
                onClick={() => handleSelect(color.value)}
                title={color.name}
                type="button"
              >
                <span
                  className="size-full rounded-full"
                  style={{ backgroundColor: color.value }}
                />
                {isSelected && (
                  <RiCheckLine className="absolute size-4 text-ui-fg-on-color drop-shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
