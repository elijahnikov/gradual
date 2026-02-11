import type { RouterOutputs } from "@gradual/api";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Input } from "@gradual/ui/input";
import { RiArrowDownSLine, RiCloseLine, RiSearchLine } from "@remixicon/react";
import { useCallback, useState } from "react";
import { useDebounce } from "react-use";
import type { EventFilters } from "./types";

type Variation =
  RouterOutputs["featureFlags"]["getByKey"]["variations"][number];

const REASON_TYPES = [
  { value: "rule_match", label: "Rule match" },
  { value: "default", label: "Default" },
  { value: "off", label: "Off" },
  { value: "percentage_rollout", label: "Rollout" },
  { value: "error", label: "Error" },
] as const;

const LATENCY_PRESETS = [
  { label: "> 1ms", us: 1000 },
  { label: "> 5ms", us: 5000 },
  { label: "> 10ms", us: 10_000 },
  { label: "> 50ms", us: 50_000 },
] as const;

interface EventFilterBarProps {
  variations: Variation[];
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
}

export default function EventFilterBar({
  variations,
  filters,
  onFiltersChange,
}: EventFilterBarProps) {
  const [ruleSearch, setRuleSearch] = useState(filters.targetNameSearch ?? "");

  useDebounce(
    () => {
      const value = ruleSearch.trim() || undefined;
      if (value !== filters.targetNameSearch) {
        onFiltersChange({ ...filters, targetNameSearch: value });
      }
    },
    300,
    [ruleSearch]
  );

  const toggleVariation = useCallback(
    (variationId: string) => {
      const current = filters.variationIds ?? [];
      const next = current.includes(variationId)
        ? current.filter((id) => id !== variationId)
        : [...current, variationId];
      onFiltersChange({
        ...filters,
        variationIds: next.length > 0 ? next : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const toggleReasonType = useCallback(
    (reasonType: string) => {
      const current = filters.reasonTypes ?? [];
      const next = current.includes(reasonType)
        ? current.filter((r) => r !== reasonType)
        : [...current, reasonType];
      onFiltersChange({
        ...filters,
        reasonTypes: next.length > 0 ? next : undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const handleLatency = useCallback(
    (us: number | null) => {
      onFiltersChange({
        ...filters,
        minLatencyUs: us ?? undefined,
      });
    },
    [filters, onFiltersChange]
  );

  const hasActiveFilters =
    filters.variationIds ||
    filters.reasonTypes ||
    filters.targetNameSearch ||
    filters.minLatencyUs != null ||
    filters.sdkVersion ||
    filters.startDate;

  const clearAllFilters = useCallback(() => {
    setRuleSearch("");
    onFiltersChange({});
  }, [onFiltersChange]);

  return (
    <div className="flex items-center gap-1.5 border-b bg-ui-bg-subtle px-2 py-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="gap-x-1" size="small" variant="outline" />}
        >
          <span className="text-xs">Variation</span>
          {filters.variationIds && filters.variationIds.length > 0 && (
            <Badge
              className="ml-0.5 px-1 py-0 font-mono text-[10px]"
              size="sm"
              variant="info"
            >
              {filters.variationIds.length}
            </Badge>
          )}
          <RiArrowDownSLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Variations</DropdownMenuLabel>
            {variations.map((v) => (
              <DropdownMenuCheckboxItem
                checked={(filters.variationIds ?? []).includes(v.id)}
                key={v.id}
                onClick={() => toggleVariation(v.id)}
              >
                <span className="flex items-center gap-1.5">
                  {v.color && (
                    <span
                      className="size-2.5 shrink-0 rounded-[3px]"
                      style={{ backgroundColor: v.color }}
                    />
                  )}
                  <span className="text-xs">{v.name}</span>
                </span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="gap-x-1" size="small" variant="outline" />}
        >
          <span className="text-xs">Reason</span>
          {filters.reasonTypes && filters.reasonTypes.length > 0 && (
            <Badge
              className="ml-0.5 px-1 py-0 font-mono text-[10px]"
              size="sm"
              variant="info"
            >
              {filters.reasonTypes.length}
            </Badge>
          )}
          <RiArrowDownSLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Reason type</DropdownMenuLabel>
            {REASON_TYPES.map((r) => (
              <DropdownMenuCheckboxItem
                checked={(filters.reasonTypes ?? []).includes(r.value)}
                key={r.value}
                onClick={() => toggleReasonType(r.value)}
              >
                <span className="text-xs">{r.label}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="gap-x-1" size="small" variant="outline" />}
        >
          <span className="text-xs">Latency</span>
          {filters.minLatencyUs != null && (
            <Badge
              className="ml-0.5 px-1 py-0 font-mono text-[10px]"
              size="sm"
              variant="info"
            >
              {`>${filters.minLatencyUs / 1000}ms`}
            </Badge>
          )}
          <RiArrowDownSLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Min latency</DropdownMenuLabel>
            {LATENCY_PRESETS.map((l) => (
              <DropdownMenuCheckboxItem
                checked={filters.minLatencyUs === l.us}
                key={l.us}
                onClick={() =>
                  handleLatency(filters.minLatencyUs === l.us ? null : l.us)
                }
              >
                <span className="font-mono text-xs">{l.label}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative -mt-px">
        <RiSearchLine className="absolute top-1.5 left-1.5 z-10 size-3.5 shrink-0 text-ui-fg-muted" />
        <Input
          className="h-6 w-36 rounded-sm ps-6 text-xs"
          onChange={(e) => setRuleSearch(e.target.value)}
          placeholder="Search rules"
          size="small"
          value={ruleSearch}
        />
      </div>

      {hasActiveFilters && (
        <div className="ml-auto">
          <Button
            className="h-7 gap-x-1 text-ui-fg-muted"
            onClick={clearAllFilters}
            size="small"
            variant="ghost"
          >
            <RiCloseLine className="size-3.5 shrink-0" />
            <span className="text-xs">Clear</span>
          </Button>
        </div>
      )}
    </div>
  );
}
