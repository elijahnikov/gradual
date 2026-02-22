import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import React, { useCallback, useMemo } from "react";
import { useSelectedEnvironmentsStore } from "@/lib/stores/selected-environments-store";
import { useTRPC } from "@/lib/trpc";
import EmptyEnvironmentsList from "./empty-state";
import EnvironmentListItem from "./environment-list-item";
import { environmentsSearchParams } from "./environments-search-params";
import NoResultsState from "./no-results-state";
import SelectedEnvironmentsActions from "./selected-environments-actions";

interface EnvironmentsListProps {
  projectId: string;
  organizationId: string;
  organizationSlug: string;
  projectSlug: string;
}

export default function EnvironmentsList({
  projectId,
  organizationId,
  organizationSlug,
  projectSlug,
}: EnvironmentsListProps) {
  const trpc = useTRPC();
  const [{ sortBy, sortOrder, search }] = useQueryStates(
    environmentsSearchParams
  );

  const {
    setSelectedEnvironments,
    clearSelectedEnvironments,
    selectedEnvironments,
  } = useSelectedEnvironmentsStore();

  const { data: environments } = useSuspenseQuery(
    trpc.environment.list.queryOptions({
      organizationId,
      projectId,
    })
  );

  const filteredAndSorted = useMemo(() => {
    let result = environments;

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (env) =>
          env.name.toLowerCase().includes(lower) ||
          env.slug.toLowerCase().includes(lower)
      );
    }

    result = [...result].sort((a, b) => {
      if (sortBy === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });

    return result;
  }, [environments, search, sortBy, sortOrder]);

  const handleSelectAll = useCallback(
    (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        const target = event.target as HTMLElement;
        const isInputField =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;

        if (!isInputField) {
          event.preventDefault();
          const currentSelected = selectedEnvironments;
          const allSelected =
            filteredAndSorted.length > 0 &&
            filteredAndSorted.every((env) =>
              currentSelected.some((e) => e.id === env.id)
            );

          if (allSelected) {
            clearSelectedEnvironments();
          } else {
            setSelectedEnvironments(
              filteredAndSorted.map((env) => ({
                id: env.id,
                slug: env.slug,
                name: env.name,
              }))
            );
          }
        }
      }
    },
    [
      selectedEnvironments,
      setSelectedEnvironments,
      clearSelectedEnvironments,
      filteredAndSorted,
    ]
  );

  const handleClearSelection = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (!isInputField && selectedEnvironments.length > 0) {
        event.preventDefault();
        clearSelectedEnvironments();
      }
    },
    [selectedEnvironments.length, clearSelectedEnvironments]
  );

  useHotkey("Mod+A", handleSelectAll);
  useHotkey("Escape", handleClearSelection);

  if (environments.length === 0) {
    return <EmptyEnvironmentsList />;
  }

  if (filteredAndSorted.length === 0) {
    return <NoResultsState />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col">
        {filteredAndSorted.map((item) => (
          <React.Fragment key={item.id}>
            <EnvironmentListItem environment={item} />
            <Separator />
          </React.Fragment>
        ))}
      </div>
      {selectedEnvironments.length > 0 && (
        <SelectedEnvironmentsActions
          organizationSlug={organizationSlug}
          projectSlug={projectSlug}
        />
      )}
    </div>
  );
}

export function EnvironmentsListSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-y-2 px-2 py-2">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton className="h-12 w-full" key={index} />
      ))}
    </div>
  );
}
