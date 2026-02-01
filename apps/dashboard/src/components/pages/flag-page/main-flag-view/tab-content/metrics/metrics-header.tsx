import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Calendar } from "@gradual/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@gradual/ui/popover";
import { Text } from "@gradual/ui/text";
import {
  RiArrowDownSLine,
  RiCalendarLine,
  RiFilter3Line,
} from "@remixicon/react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { type TimeframePreset, useMetricsStore } from "./metrics-store";
import type { MetricsVariation } from "./types";

const TIMEFRAME_PRESETS: {
  value: TimeframePreset;
  label: string;
  days: number;
}[] = [
  { value: "24h", label: "Last 24 hours", days: 1 },
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
];

interface MetricsHeaderProps {
  variations: MetricsVariation[];
}

export default function MetricsHeader({ variations }: MetricsHeaderProps) {
  const timeframePreset = useMetricsStore((s) => s.timeframePreset);
  const dateRange = useMetricsStore((s) => s.dateRange);
  const setTimeframePreset = useMetricsStore((s) => s.setTimeframePreset);
  const setCustomDateRange = useMetricsStore((s) => s.setCustomDateRange);
  const selectedVariationIds = useMetricsStore((s) => s.selectedVariationIds);
  const toggleVariation = useMetricsStore((s) => s.toggleVariation);

  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });

  const handlePresetClick = (preset: TimeframePreset) => {
    setTimeframePreset(preset);
    setSelectedRange(undefined);
    setIsOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    setSelectedRange(range);
  };

  const handleApplyCustomRange = () => {
    if (selectedRange?.from && selectedRange?.to) {
      setCustomDateRange({ from: selectedRange.from, to: selectedRange.to });
      setIsOpen(false);
    }
  };

  const hasValidCustomRange =
    selectedRange?.from &&
    selectedRange?.to &&
    selectedRange.from.getTime() !== selectedRange.to.getTime();

  const formatDateRange = () => {
    const formatDate = (date: Date) =>
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (timeframePreset !== "custom") {
      const preset = TIMEFRAME_PRESETS.find((p) => p.value === timeframePreset);
      return preset?.label ?? "Select date range";
    }

    return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger render={<Button size="small" variant="outline" />}>
          <RiCalendarLine className="size-4" />
          <Text size="small">{formatDateRange()}</Text>
          <RiArrowDownSLine className="size-4" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <div className="flex">
            <div className="flex flex-col gap-y-1 border-r p-2">
              <Text
                className="mb-2 px-2 text-ui-fg-muted"
                size="xsmall"
                weight="plus"
              >
                Quick select
              </Text>
              {TIMEFRAME_PRESETS.map((preset) => (
                <Button
                  className="justify-start"
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  size="small"
                  variant={
                    timeframePreset === preset.value ? "gradual" : "ghost"
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 p-2">
              <Calendar
                defaultMonth={dateRange.from}
                mode="range"
                numberOfMonths={2}
                onSelect={handleRangeSelect}
                selected={selectedRange}
              />
              {hasValidCustomRange && (
                <Button
                  className="self-end"
                  onClick={handleApplyCustomRange}
                  size="small"
                  variant="gradual"
                >
                  Apply
                </Button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="small" variant="outline" />}>
          <RiFilter3Line className="size-4" />
          <Text size="small">Variations</Text>
          <Badge size="sm" variant="outline">
            {selectedVariationIds.size}/{variations.length}
          </Badge>
          <RiArrowDownSLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {variations.map((variation) => (
            <DropdownMenuCheckboxItem
              checked={selectedVariationIds.has(variation.id)}
              key={variation.id}
              onCheckedChange={() => toggleVariation(variation.id)}
            >
              {variation.name}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
