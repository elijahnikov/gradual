import type { RouterOutputs } from "@gradual/api";
import { cn } from "@gradual/ui";
import { Checkbox } from "@gradual/ui/checkbox";
import { Text } from "@gradual/ui/text";
import { useCallback, useMemo } from "react";
import { useSelectedEnvironmentsStore } from "@/lib/stores/selected-environments-store";
import EnvironmentListItemStats from "./stats";

type EnvironmentListItemData = RouterOutputs["environment"]["list"][number];

export default function EnvironmentListItem({
  environment,
}: {
  environment: EnvironmentListItemData;
}) {
  const selectedEnvironments = useSelectedEnvironmentsStore(
    (state) => state.selectedEnvironments
  );
  const setSelectedEnvironments = useSelectedEnvironmentsStore(
    (state) => state.setSelectedEnvironments
  );

  const handleSelectEnvironment = useCallback(
    (envId: string) => {
      const current =
        useSelectedEnvironmentsStore.getState().selectedEnvironments;
      if (current.some((e) => e.id === envId)) {
        setSelectedEnvironments(current.filter((e) => e.id !== envId));
      } else {
        setSelectedEnvironments([
          ...current,
          {
            id: envId,
            slug: environment.slug,
            name: environment.name,
          },
        ]);
      }
    },
    [setSelectedEnvironments, environment.slug, environment.name]
  );

  const isSelected = useMemo(
    () => selectedEnvironments.some((e) => e.id === environment.id),
    [selectedEnvironments, environment.id]
  );

  return (
    <div
      className="group/environment flex h-16 items-center border-0 px-4 hover:bg-ui-bg-subtle-hover data-[selected=true]:bg-ui-button-recall/10"
      data-selected={isSelected}
    >
      {/** biome-ignore lint/a11y/noNoninteractiveElementInteractions: <> */}
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: <> */}
      {/** biome-ignore lint/a11y/noStaticElementInteractions: <> */}
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <Checkbox
          checked={isSelected}
          className={cn(
            "mt-[3.5px] mr-3 opacity-0 transition-opacity duration-200 ease-in-out group-hover/environment:opacity-100",
            isSelected && "opacity-100"
          )}
          data-checked={isSelected}
          onCheckedChange={() => handleSelectEnvironment(environment.id)}
        />
      </div>
      <div className="flex flex-col gap-y-0.5">
        <div className="flex items-center gap-2">
          {environment.color && (
            <div
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: environment.color }}
            />
          )}
          <Text className="text-[14px]" weight="plus">
            {environment.name}
          </Text>
        </div>
        <EnvironmentListItemStats
          createdAt={environment.createdAt}
          enabledFlags={environment.enabledFlags}
          slug={environment.slug}
          totalFlags={environment.totalFlags}
        />
      </div>
    </div>
  );
}
