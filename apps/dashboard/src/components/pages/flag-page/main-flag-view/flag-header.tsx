import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Button } from "@gradual/ui/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxTrigger,
  ComboboxValue,
} from "@gradual/ui/combobox";
import CopyButton from "@gradual/ui/copy-button";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import {
  RiArrowDownSLine,
  RiCalendarFill,
  RiKey2Fill,
  RiTimeFill,
  RiUserFill,
  RiUserSmileLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import EditableDescription from "@/components/common/editable-description";
import EditableTitle from "@/components/common/editable-title";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

interface FlagHeaderProps {
  flag: Pick<RouterOutputs["featureFlags"]["getByKey"], "flag" | "maintainer">;
  organizationSlug: string;
  projectSlug: string;
}

export default function FlagHeader({
  flag: { flag },
  organizationSlug,
  projectSlug,
}: FlagHeaderProps) {
  const [optimisticName, setOptimisticName] = useState<string | undefined>(
    undefined
  );
  const [optimisticDescription, setOptimisticDescription] = useState<
    string | null | undefined
  >(undefined);
  const [optimisticMaintainerId, setOptimisticMaintainerId] = useState<
    string | null | undefined
  >(undefined);
  const [savingField, setSavingField] = useState<
    "name" | "description" | "maintainer" | null
  >(null);
  const [maintainerSearchTerm, setMaintainerSearchTerm] = useState("");
  const { canUpdateFlags } = usePermissions();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    ...trpc.organizationMember.getMembers.queryOptions({
      organizationSlug,
      getWithPermissions: false,
      orderBy: "createdAt",
      orderDirection: "asc",
      limit: 20,
      offset: 0,
      textSearch: maintainerSearchTerm,
    }),
    enabled: !!organizationSlug,
  });

  interface MemberItem {
    value: string | null;
    label: string;
    avatar: string | undefined;
  }

  const memberItems = useMemo(() => {
    const items: MemberItem[] = [
      { value: null, label: "No maintainer", avatar: "no-maintainer" },
    ];

    if (!members?.length) {
      return items;
    }

    const formattedMembers: MemberItem[] = members.map((member) => ({
      value: member.user.id,
      label: member.user.name,
      avatar: member.user.image ?? undefined,
    }));

    return items.concat(formattedMembers);
  }, [members]);

  const currentMaintainerId =
    optimisticMaintainerId !== undefined
      ? optimisticMaintainerId
      : flag.maintainerId;

  const selectedMaintainer = useMemo(() => {
    if (!currentMaintainerId) {
      return null;
    }
    return (
      memberItems.find((item) => item.value === currentMaintainerId) ?? null
    );
  }, [currentMaintainerId, memberItems]);

  const updateMutation = useMutation(
    trpc.featureFlags.update.mutationOptions({
      onMutate: (variables) => {
        if (variables.name !== undefined) {
          setOptimisticName(variables.name);
          setSavingField("name");
        }
        if (variables.description !== undefined) {
          setOptimisticDescription(variables.description);
          setSavingField("description");
        }
        if (variables.maintainerId !== undefined) {
          setOptimisticMaintainerId(variables.maintainerId);
          setSavingField("maintainer");
        }
      },
      onError: () => {
        setOptimisticName(undefined);
        setOptimisticDescription(undefined);
        setOptimisticMaintainerId(undefined);
        setSavingField(null);
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [["featureFlags", "getByKey"]],
        });
        setOptimisticName(undefined);
        setOptimisticDescription(undefined);
        setOptimisticMaintainerId(undefined);
        setSavingField(null);
      },
    })
  );

  const displayName = optimisticName !== undefined ? optimisticName : flag.name;
  const displayDescription =
    optimisticDescription !== undefined
      ? optimisticDescription
      : flag.description;

  const handleNameUpdate = (newName: string) => {
    if (newName && newName !== flag.name) {
      updateMutation.mutate({
        flagId: flag.id,
        projectSlug,
        organizationSlug,
        name: newName,
      });
    }
  };

  const handleDescriptionUpdate = (newDescription: string | null) => {
    if (newDescription !== flag.description) {
      updateMutation.mutate({
        flagId: flag.id,
        projectSlug,
        organizationSlug,
        description: newDescription,
      });
    }
  };

  const handleMaintainerUpdate = (newMaintainerId: string | null) => {
    if (newMaintainerId !== flag.maintainerId) {
      updateMutation.mutate({
        flagId: flag.id,
        projectSlug,
        organizationSlug,
        maintainerId: newMaintainerId,
      });
    }
  };
  return (
    <TooltipProvider>
      <div className="flex items-start justify-between border-b px-4 py-3">
        <div className="relative top-0 flex w-full flex-col gap-y-1">
          <div className="absolute top-0 w-full">
            <EditableTitle
              loading={savingField === "name"}
              readOnly={!canUpdateFlags}
              title={displayName}
              updateCallback={handleNameUpdate}
            />
          </div>
          <div className="absolute top-7 w-full">
            <EditableDescription
              description={displayDescription}
              loading={savingField === "description"}
              readOnly={!canUpdateFlags}
              updateCallback={handleDescriptionUpdate}
            />
          </div>
          <div className="mt-16 w-full">
            <div className="mt-2 flex w-full items-center justify-between gap-x-6">
              {/* Key */}
              <div>
                <div className="flex items-center gap-1">
                  <RiKey2Fill className="size-4 text-ui-fg-muted" />
                  <Text className="font-mono text-ui-fg-muted text-xs">
                    {flag.key}
                  </Text>
                  <CopyButton
                    className="size-5 [&_svg]:size-3"
                    text={flag.key}
                  />
                </div>
              </div>
              {/* Created on */}
              <div className="relative left-1 flex items-center gap-x-6">
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-x-1">
                      <RiCalendarFill className="size-4 text-ui-fg-muted" />
                      <Text
                        className="font-medium text-ui-fg-base"
                        size="xsmall"
                      >
                        {dayjs(flag.createdAt).format("MMM DD, YYYY")}
                      </Text>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Created on {dayjs(flag.createdAt).format("MMM DD, YYYY")}
                  </TooltipContent>
                </Tooltip>
                {/* Last updated */}
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-x-1">
                      <RiTimeFill className="size-4 text-ui-fg-muted" />
                      <Text
                        className="font-medium text-ui-fg-base"
                        size="xsmall"
                      >
                        {dayjs(flag.updatedAt).format("MMM DD, YYYY")}
                      </Text>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Last updated on{" "}
                    {dayjs(flag.updatedAt).format("MMM DD, YYYY")}
                  </TooltipContent>
                </Tooltip>

                <Combobox
                  autoHighlight
                  disabled={!canUpdateFlags}
                  items={memberItems}
                  onValueChange={(value) => {
                    handleMaintainerUpdate(value);
                  }}
                  value={currentMaintainerId}
                >
                  <ComboboxTrigger
                    render={
                      <Button
                        className="h-auto min-w-44 justify-start gap-1 px-1.5 py-1"
                        size="small"
                        variant="ghost"
                      />
                    }
                  >
                    <RiUserFill className="size-4 text-ui-fg-muted" />
                    <ComboboxValue>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="size-5">
                          {selectedMaintainer ? (
                            <>
                              <AvatarImage src={selectedMaintainer.avatar} />
                              <AvatarFallback>
                                {selectedMaintainer.label
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </>
                          ) : (
                            <AvatarFallback>
                              <RiUserSmileLine className="size-3" />
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <Text
                          className="font-medium text-ui-fg-base"
                          size="xsmall"
                        >
                          {selectedMaintainer?.label ?? "Unassigned"}
                        </Text>
                      </div>
                    </ComboboxValue>
                    <RiArrowDownSLine className="ml-auto size-4 text-ui-fg-muted" />
                  </ComboboxTrigger>
                  <ComboboxPopup className="w-full">
                    <div className="border-b p-2">
                      <ComboboxInput
                        aria-label="Select a maintainer"
                        className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                        onChange={(e) =>
                          setMaintainerSearchTerm(e.target.value)
                        }
                        placeholder="Search for team member"
                        showTrigger={false}
                        value={maintainerSearchTerm}
                      />
                    </div>
                    {isLoadingMembers ? (
                      <div className="p-2">
                        <Skeleton className="h-7 w-full" />
                      </div>
                    ) : (
                      <>
                        <ComboboxEmpty>No members found.</ComboboxEmpty>
                        <ComboboxList>
                          {(member: MemberItem) => (
                            <ComboboxItem
                              className="w-full"
                              key={member.value}
                              value={member.value}
                            >
                              <div className="flex items-center justify-center gap-2 py-0.5">
                                {member.avatar === "no-maintainer" ? (
                                  <RiUserSmileLine className="size-4" />
                                ) : (
                                  <Avatar className="size-4">
                                    <AvatarImage
                                      alt="User"
                                      src={member.avatar ?? undefined}
                                    />
                                    <AvatarFallback>
                                      {member.label.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <span className="whitespace-nowrap text-sm">
                                  {member.label}
                                </span>
                              </div>
                            </ComboboxItem>
                          )}
                        </ComboboxList>
                      </>
                    )}
                  </ComboboxPopup>
                </Combobox>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
