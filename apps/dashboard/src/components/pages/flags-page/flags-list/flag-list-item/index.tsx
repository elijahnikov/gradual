import type { RouterOutputs } from "@gradual/api";
import { cn } from "@gradual/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Card } from "@gradual/ui/card";
import { Checkbox } from "@gradual/ui/checkbox";
import { Text } from "@gradual/ui/text";
import { RiUserSmileLine } from "@remixicon/react";
import { Link, useParams } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import FlagContextMenu from "@/components/common/context-menus/flag-context-menu";
import { useSelectedFlagsStore } from "@/lib/stores/selected-flags-store";
import EvaluationsPreviewChart from "./evaluations-chart";
import FlagListItemStats from "./stats";

type FlagListItemData =
  RouterOutputs["featureFlags"]["getAll"]["items"][number];

export default function FlagListItem({ flag }: { flag: FlagListItemData }) {
  const { featureFlag, maintainer, evaluationCount } = flag;

  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/flags/",
  });

  const selectedFlags = useSelectedFlagsStore((state) => state.selectedFlags);
  const setSelectedFlags = useSelectedFlagsStore(
    (state) => state.setSelectedFlags
  );

  const handleSelectFlag = useCallback(
    (flagId: string) => {
      const currentFlags = useSelectedFlagsStore.getState().selectedFlags;
      if (currentFlags.some((f) => f.id === flagId)) {
        setSelectedFlags(currentFlags.filter((f) => f.id !== flagId));
      } else {
        setSelectedFlags([
          ...currentFlags,
          {
            id: flagId,
            key: flag.featureFlag.key,
            name: flag.featureFlag.name,
          },
        ]);
      }
    },
    [setSelectedFlags, flag.featureFlag.name, flag.featureFlag.key]
  );

  const isSelected = useMemo(
    () => selectedFlags.some((f) => f.id === flag.featureFlag.id),
    [selectedFlags, flag.featureFlag.id]
  );

  return (
    <FlagContextMenu flag={flag.featureFlag}>
      <div
        className="group/flag flex h-16 items-center border-0 px-4 data-[selected=true]:bg-ui-button-recall/10"
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
              "mt-[3.5px] mr-3 opacity-0 transition-opacity duration-200 ease-in-out group-hover/flag:opacity-100",
              isSelected && "opacity-100"
            )}
            data-checked={isSelected}
            onCheckedChange={() => handleSelectFlag(flag.featureFlag.id)}
          />
        </div>
        <div className="flex flex-col gap-y-0.5">
          <Link
            params={{
              organizationSlug,
              projectSlug,
              flagSlug: flag.featureFlag.key,
            }}
            preload="intent"
            search={{}}
            to="/$organizationSlug/$projectSlug/flags/$flagSlug"
          >
            <Text
              className="cursor-pointer text-[14px] hover:underline"
              weight="plus"
            >
              {featureFlag.name}
            </Text>
          </Link>
          <FlagListItemStats
            createdAt={featureFlag.createdAt}
            evaluationCount={evaluationCount}
            flagKey={featureFlag.key}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="p-2">
            <EvaluationsPreviewChart
              flagId={featureFlag.id}
              organizationId={featureFlag.organizationId}
              projectId={featureFlag.projectId}
            />
          </div>

          <div className="relative -left-3.5 ml-2">
            {maintainer ? (
              <Avatar className="size-6 shadow-buttons-neutral">
                <AvatarImage src={maintainer?.image ?? undefined} />
                <AvatarFallback>{maintainer?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
            ) : (
              <Card className="flex size-6! shrink-0 items-center justify-center rounded-full p-0">
                <RiUserSmileLine className="size-4 shrink-0 text-ui-fg-muted/50" />
              </Card>
            )}
          </div>
        </div>
      </div>
    </FlagContextMenu>
  );
}
