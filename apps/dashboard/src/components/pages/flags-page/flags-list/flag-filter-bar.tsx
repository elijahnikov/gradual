import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Input } from "@gradual/ui/input";
import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import {
  RiAddLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCloseLine,
  RiFilterLine,
  RiSearchLine,
} from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import React, { useEffect, useMemo, useState } from "react";
import { useDebounce } from "react-use";
import CreateEnvironmentDialog from "@/components/common/dialogs/create-environment-dialog";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useChartEnvironmentsStore } from "@/lib/stores/chart-environments-store";
import { useTRPC } from "@/lib/trpc";
import { flagsSearchParams, type SortBy } from "./flags-search-params";

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "createdAt", label: "Created at" },
  { value: "updatedAt", label: "Updated at" },
  { value: "evaluationCount", label: "Number of evaluations" },
];

interface FlagFilterBarProps {
  organizationSlug: string;
  projectSlug: string;
}

export default function FlagFilterBar({
  organizationSlug,
  projectSlug,
}: FlagFilterBarProps) {
  const trpc = useTRPC();
  const { canCreateEnvironments } = usePermissions();
  const [{ sortBy, sortOrder, search }, setQueryStates] =
    useQueryStates(flagsSearchParams);

  const [searchInput, setSearchInput] = useState(search);
  const [createEnvDialogOpen, setCreateEnvDialogOpen] = useState(false);

  const { data: project } = useQuery(
    trpc.project.getBySlug.queryOptions({
      slug: projectSlug,
      organizationSlug,
    })
  );

  const { data: environments, isLoading: environmentsLoading } = useQuery(
    trpc.environment.list.queryOptions(
      {
        organizationId: project?.organizationId ?? "",
        projectId: project?.id ?? "",
      },
      {
        enabled: !!project?.id && !!project?.organizationId,
      }
    )
  );

  const {
    getSelectedEnvironments,
    setSelectedEnvironments,
    toggleEnvironment,
  } = useChartEnvironmentsStore();

  const selectedEnvIds = project?.id ? getSelectedEnvironments(project.id) : [];

  useEffect(() => {
    if (project?.id && environments && environments.length > 0) {
      const currentSelection = getSelectedEnvironments(project.id);
      if (currentSelection.length === 0) {
        const defaultSelection = environments.slice(0, 2).map((e) => e.id);
        setSelectedEnvironments(project.id, defaultSelection);
      } else {
        const validEnvIds = new Set(environments.map((e) => e.id));
        const validSelection = currentSelection.filter((id) =>
          validEnvIds.has(id)
        );
        if (validSelection.length !== currentSelection.length) {
          if (validSelection.length === 0) {
            const defaultSelection = environments.slice(0, 2).map((e) => e.id);
            setSelectedEnvironments(project.id, defaultSelection);
          } else {
            setSelectedEnvironments(project.id, validSelection);
          }
        }
      }
    }
  }, [
    project?.id,
    environments,
    getSelectedEnvironments,
    setSelectedEnvironments,
  ]);

  useDebounce(
    () => {
      if (searchInput !== search) {
        setQueryStates({ search: searchInput || null });
      }
    },
    300,
    [searchInput]
  );

  const handleSortByClick = (newSortBy: SortBy) => {
    if (newSortBy === sortBy) {
      setQueryStates({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
    } else {
      setQueryStates({ sortBy: newSortBy, sortOrder: "desc" });
    }
  };

  const handleRemoveEnvironment = (envId: string) => {
    if (project?.id && selectedEnvIds.length > 1) {
      toggleEnvironment(project.id, envId);
    }
  };

  const handleAddEnvironment = (envId: string) => {
    if (project?.id) {
      toggleEnvironment(project.id, envId);
    }
  };

  const selectedEnvironments = useMemo(() => {
    if (!environments) {
      return [];
    }
    return environments.filter((env) => selectedEnvIds.includes(env.id));
  }, [environments, selectedEnvIds]);

  const availableEnvironments = useMemo(() => {
    if (!environments) {
      return [];
    }
    return environments.filter((env) => !selectedEnvIds.includes(env.id));
  }, [environments, selectedEnvIds]);

  const canRemove = selectedEnvIds.length > 1;
  const canAddMore = selectedEnvIds.length < 3;
  const hasAvailableEnvs = availableEnvironments.length > 0;

  return (
    <div className="sticky top-9 z-10 flex items-center justify-between border-b bg-ui-bg-subtle px-2 py-1.5">
      <div className="flex items-center gap-2">
        <div className="relative">
          <RiSearchLine className="absolute top-1.5 left-2 z-10 size-4 shrink-0 text-ui-fg-muted" />
          <Input
            className="w-64 ps-7"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search flags"
            size="small"
            value={searchInput}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="h-7 w-7 gap-x-0.5"
                size="small"
                variant="outline"
              />
            }
          >
            <RiFilterLine className="size-4 shrink-0 text-ui-fg-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {sortOptions.map((option) => {
                const isActive = sortBy === option.value;
                return (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => handleSortByClick(option.value)}
                  >
                    {option.label}
                    <div className="ml-auto">
                      {isActive &&
                        (sortOrder === "desc" ? (
                          <RiArrowDownLine className="size-3.5" />
                        ) : (
                          <RiArrowUpLine className="size-3.5" />
                        ))}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="relative -left-5 flex items-center gap-3">
        {environmentsLoading ? (
          <div className="flex items-center gap-5">
            <Skeleton className="h-7 w-34 rounded-sm" />
            <Skeleton className="h-7 w-34 rounded-sm" />
          </div>
        ) : (
          selectedEnvironments.map((env, index) => (
            <React.Fragment key={env.id}>
              <div
                className="group/badge txt-compact-small-plus relative inline-flex h-7 w-34 items-center justify-between gap-x-1.5 rounded-sm bg-ui-button-neutral py-1.5 ps-1.5 pe-1 text-ui-fg-base shadow-buttons-neutral outline-none"
                key={env.id}
              >
                <span
                  className="size-4 shrink-0 rounded-full"
                  style={{ backgroundColor: env.color ?? undefined }}
                />
                <Text className="w-full truncate" size="xsmall" weight="plus">
                  {env.name}
                </Text>
                {canRemove && (
                  <Button
                    className="relative right-0 aspect-square size-5!"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveEnvironment(env.id);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    <RiCloseLine className="size-3.5 shrink-0" />
                  </Button>
                )}
              </div>

              {index < selectedEnvironments.length - 1 && (
                <Separator orientation="vertical" />
              )}
            </React.Fragment>
          ))
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="size-7 p-0" size="small" variant="outline" />
            }
          >
            <RiAddLine className="size-4 shrink-0 text-ui-fg-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canAddMore &&
              availableEnvironments.map((env) => (
                <DropdownMenuItem
                  className="flex items-center gap-x-1.5"
                  key={env.id}
                  onClick={() => handleAddEnvironment(env.id)}
                >
                  <span
                    className="size-4 shrink-0 rounded-full"
                    style={{ backgroundColor: env.color ?? undefined }}
                  />
                  {env.name}
                </DropdownMenuItem>
              ))}
            {!hasAvailableEnvs && canAddMore && (
              <div className="px-2 py-1.5 text-ui-fg-muted text-xs">
                All environments selected
              </div>
            )}
            {!canAddMore && (
              <div className="px-2 py-1.5 text-ui-fg-muted text-xs">
                Maximum of 3 environments
              </div>
            )}
            <DropdownMenuItem
              disabled={!canCreateEnvironments}
              onClick={() => setCreateEnvDialogOpen(true)}
            >
              <RiAddLine className="size-4 shrink-0 text-ui-fg-muted" />
              Create new environment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CreateEnvironmentDialog
        onOpenChange={setCreateEnvDialogOpen}
        open={createEnvDialogOpen}
      />
    </div>
  );
}
