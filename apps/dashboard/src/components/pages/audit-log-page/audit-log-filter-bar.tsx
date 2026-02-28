import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import { Calendar } from "@gradual/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Input } from "@gradual/ui/input";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Popover, PopoverContent, PopoverTrigger } from "@gradual/ui/popover";
import { Text } from "@gradual/ui/text";
import {
  RiArrowDownSLine,
  RiCalendarLine,
  RiCloseLine,
  RiDownloadLine,
  RiSearchLine,
} from "@remixicon/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { useDebounce } from "react-use";
import { useTRPC } from "@/lib/trpc";
import {
  type ActionFilter,
  actionLabels,
  auditLogSearchParams,
  type ResourceTypeFilter,
  resourceTypeLabels,
} from "./audit-log-search-params";

const actionOptions = Object.entries(actionLabels) as [ActionFilter, string][];
const resourceTypeOptions = Object.entries(resourceTypeLabels) as [
  ResourceTypeFilter,
  string,
][];

const DATE_PRESETS = [
  { label: "Last 24 hours", hours: 24 },
  { label: "Last 7 days", hours: 7 * 24 },
  { label: "Last 30 days", hours: 30 * 24 },
  { label: "Last 90 days", hours: 90 * 24 },
] as const;

type OrgMember = RouterOutputs["organizationMember"]["getMembers"][number];

function formatDateLabel(startDate: string | null, endDate: string | null) {
  if (!(startDate && endDate)) {
    return "Date range";
  }
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

export default function AuditLogFilterBar() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/audit-log/",
  });

  const [
    { action, resourceType, userId, search, startDate, endDate },
    setQueryStates,
  ] = useQueryStates(auditLogSearchParams);

  const [searchValue, setSearchValue] = useState(search ?? "");
  useDebounce(
    () => {
      const value = searchValue.trim() || null;
      if (value !== search) {
        setQueryStates({ search: value });
      }
    },
    300,
    [searchValue]
  );

  const { data: members } = useQuery({
    ...trpc.organizationMember.getMembers.queryOptions({
      organizationSlug,
      getWithPermissions: false,
      orderBy: "createdAt",
      orderDirection: "asc",
      limit: 50,
      offset: 0,
    }),
    enabled: !!organizationSlug,
  });

  const selectedMember = members?.find((m: OrgMember) => m.user.id === userId);

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(
    startDate && endDate
      ? { from: new Date(startDate), to: new Date(endDate) }
      : undefined
  );

  const handlePresetClick = (hours: number) => {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
    setQueryStates({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    setSelectedRange({ from: start, to: end });
    setDatePickerOpen(false);
  };

  const handleApplyCustomRange = () => {
    if (selectedRange?.from && selectedRange?.to) {
      setQueryStates({
        startDate: selectedRange.from.toISOString(),
        endDate: selectedRange.to.toISOString(),
      });
      setDatePickerOpen(false);
    }
  };

  const hasValidCustomRange =
    selectedRange?.from &&
    selectedRange?.to &&
    selectedRange.from.getTime() !== selectedRange.to.getTime();

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await queryClient.fetchQuery(
        trpc.auditLog.export.queryOptions({
          organizationSlug,
          projectSlug,
          action: action ?? undefined,
          resourceType: resourceType ?? undefined,
          userId: userId ?? undefined,
          search: search ?? undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        })
      );

      const headers = [
        "Timestamp",
        "User Name",
        "User Email",
        "Action",
        "Resource Type",
        "Resource ID",
        "Resource Name",
        "Project",
        "IP Address",
        "Metadata",
      ];

      const csvRows = result.items.map((item) => {
        const meta = item.metadata as Record<string, unknown> | null;
        const resourceName =
          (meta?.name as string) ?? (meta?.key as string) ?? "";
        return [
          item.createdAt?.toISOString() ?? "",
          item.user.name ?? "",
          item.user.email,
          item.action,
          item.resourceType,
          item.resourceId,
          resourceName,
          item.projectName ?? "",
          item.ipAddress ?? "",
          meta ? JSON.stringify(meta) : "",
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",");
      });

      const csv = [headers.join(","), ...csvRows].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const hasFilters =
    action !== null ||
    resourceType !== null ||
    userId !== null ||
    search !== null ||
    startDate !== null ||
    endDate !== null;

  return (
    <div className="flex items-center gap-1.5 border-b bg-ui-bg-subtle px-2 py-1.5">
      {/* Search */}
      <div className="relative">
        <RiSearchLine className="absolute top-1.5 left-1.5 z-10 size-3.5 shrink-0 text-ui-fg-muted" />
        <Input
          className="h-6 w-40 rounded-sm ps-7 text-xs"
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search resources"
          size="small"
          value={searchValue}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="gap-x-1" size="small" variant="outline" />}
        >
          <span className="text-xs">Action</span>
          {action && (
            <Badge
              className="ml-0.5 px-1 py-0 font-mono text-[10px]"
              size="sm"
              variant="info"
            >
              {actionLabels[action]}
            </Badge>
          )}
          <RiArrowDownSLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Action type</DropdownMenuLabel>
            {actionOptions.map(([value, label]) => (
              <DropdownMenuCheckboxItem
                checked={action === value}
                key={value}
                onClick={() =>
                  setQueryStates({
                    action: action === value ? null : value,
                  })
                }
              >
                <span className="text-xs">{label}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="gap-x-1" size="small" variant="outline" />}
        >
          <span className="text-xs">Resource</span>
          {resourceType && (
            <Badge
              className="ml-0.5 px-1 py-0 font-mono text-[10px]"
              size="sm"
              variant="info"
            >
              {resourceTypeLabels[resourceType]}
            </Badge>
          )}
          <RiArrowDownSLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Resource type</DropdownMenuLabel>
            {resourceTypeOptions.map(([value, label]) => (
              <DropdownMenuCheckboxItem
                checked={resourceType === value}
                key={value}
                onClick={() =>
                  setQueryStates({
                    resourceType: resourceType === value ? null : value,
                  })
                }
              >
                <span className="text-xs">{label}</span>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="gap-x-1" size="small" variant="outline" />}
        >
          <span className="text-xs">User</span>
          {selectedMember && (
            <Badge
              className="ml-0.5 px-1 py-0 font-mono text-[10px]"
              size="sm"
              variant="info"
            >
              {selectedMember.user.name ?? selectedMember.user.email}
            </Badge>
          )}
          <RiArrowDownSLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Filter by user</DropdownMenuLabel>
            {members?.map((member: OrgMember) => (
              <DropdownMenuCheckboxItem
                checked={userId === member.user.id}
                key={member.user.id}
                onClick={() =>
                  setQueryStates({
                    userId: userId === member.user.id ? null : member.user.id,
                  })
                }
              >
                <div className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarImage src={member.user.image ?? undefined} />
                    <AvatarFallback className="text-[9px]">
                      {member.user.name?.charAt(0) ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">
                    {member.user.name ?? member.user.email}
                  </span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover onOpenChange={setDatePickerOpen} open={datePickerOpen}>
        <PopoverTrigger
          render={<Button className="gap-x-1" size="small" variant="outline" />}
        >
          <RiCalendarLine className="size-3.5" />
          <span className="text-xs">{formatDateLabel(startDate, endDate)}</span>
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
              {DATE_PRESETS.map((preset) => (
                <Button
                  className="justify-start"
                  key={preset.hours}
                  onClick={() => handlePresetClick(preset.hours)}
                  size="small"
                  variant="ghost"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-col gap-2 p-2">
              <Calendar
                defaultMonth={startDate ? new Date(startDate) : new Date()}
                mode="range"
                numberOfMonths={2}
                onSelect={setSelectedRange}
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

      <div className="ml-auto flex items-center gap-1">
        {hasFilters && (
          <Button
            className="h-6 gap-x-1 text-ui-fg-muted"
            onClick={() =>
              setQueryStates({
                action: null,
                resourceType: null,
                userId: null,
                search: null,
                startDate: null,
                endDate: null,
              })
            }
            size="small"
            variant="ghost"
          >
            <RiCloseLine className="size-3.5 shrink-0" />
            <span className="text-xs">Clear</span>
          </Button>
        )}
        <LoadingButton
          className="h-6 gap-x-1"
          disabled={isExporting}
          loading={isExporting}
          onClick={handleExport}
          size="small"
          variant="outline"
        >
          <RiDownloadLine className="size-3.5" />
          <span className="text-xs">Export</span>
        </LoadingButton>
      </div>
    </div>
  );
}
