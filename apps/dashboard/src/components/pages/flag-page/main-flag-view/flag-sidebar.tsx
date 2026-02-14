import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Badge } from "@gradual/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import {
  RiArrowDownSLine,
  RiCalendarFill,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiHashtag,
  RiKey2Fill,
  RiLink,
  RiMoreFill,
  RiTimeFill,
  RiUserSmileLine,
} from "@remixicon/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import DeleteFlagDialog from "@/components/common/dialogs/delete-flag-dialog";
import EditableDescription from "@/components/common/editable-description";
import EditableTitle from "@/components/common/editable-title";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

const NO_MAINTAINER_VALUE = "__none__";

interface FlagSidebarProps {
  flag: RouterOutputs["featureFlags"]["getByKey"]["flag"];
  organizationSlug: string;
  projectSlug: string;
}

export default function FlagSidebar({
  flag,
  organizationSlug,
  projectSlug,
}: FlagSidebarProps) {
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { canUpdateFlags, canDeleteFlags } = usePermissions();
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
    value: string;
    label: string;
    avatar: string | undefined;
  }

  const memberItems = useMemo(() => {
    const items: MemberItem[] = [
      {
        value: NO_MAINTAINER_VALUE,
        label: "No maintainer",
        avatar: "no-maintainer",
      },
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

  const comboboxValue = currentMaintainerId ?? NO_MAINTAINER_VALUE;

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
      onError: (error) => {
        setOptimisticName(undefined);
        setOptimisticDescription(undefined);
        setOptimisticMaintainerId(undefined);
        setSavingField(null);
        toastManager.add({
          type: "error",
          title: "Failed to update flag",
          description: error.message,
        });
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.featureFlags.getByKey.pathFilter()
        );
        await queryClient.invalidateQueries(
          trpc.featureFlags.getBreadcrumbInfo.pathFilter()
        );
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

  const handleMaintainerUpdate = (newMaintainerId: string) => {
    const resolved =
      newMaintainerId === NO_MAINTAINER_VALUE ? null : newMaintainerId;
    setMaintainerSearchTerm("");
    if (resolved !== flag.maintainerId) {
      updateMutation.mutate({
        flagId: flag.id,
        projectSlug,
        organizationSlug,
        maintainerId: resolved,
      });
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(flag.key);
    toastManager.add({
      title: "Flag key copied",
      type: "success",
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${organizationSlug}/${projectSlug}/flags/${flag.key}`;
    navigator.clipboard.writeText(url);
    toastManager.add({
      title: "Link copied",
      type: "success",
    });
  };

  return (
    <div className="flex h-full w-64 min-w-64 flex-col border-l bg-ui-bg-subtle">
      {/* Title & Description */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <EditableTitle
            loading={savingField === "name"}
            readOnly={!canUpdateFlags}
            title={displayName}
            updateCallback={handleNameUpdate}
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button className="size-6 shrink-0" variant="outline" />}
            >
              <RiMoreFill className="size-4 shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyKey}>
                <RiFileCopyLine />
                Copy key
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <RiLink />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-ui-fg-error [&_svg]:text-ui-fg-error"
                disabled={!canDeleteFlags}
                onClick={() => setDeleteDialogOpen(true)}
              >
                <RiDeleteBinLine />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DeleteFlagDialog
            flag={flag}
            onOpenChange={setDeleteDialogOpen}
            open={deleteDialogOpen}
          />
        </div>
        <EditableDescription
          description={displayDescription}
          loading={savingField === "description"}
          readOnly={!canUpdateFlags}
          updateCallback={handleDescriptionUpdate}
        />
      </div>

      <Separator />

      <div className="group flex flex-col gap-1 p-4">
        <Text className="text-ui-fg-muted" size="xsmall" weight="plus">
          Key
        </Text>
        <div className="flex items-center gap-1">
          <RiKey2Fill className="size-4 text-ui-fg-muted" />
          <Text className="font-mono text-xs">{flag.key}</Text>
          <CopyButton
            className="size-5 opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-3"
            text={flag.key}
          />
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2 p-4">
        <Text className="text-ui-fg-muted" size="xsmall" weight="plus">
          Maintainer
        </Text>
        <Combobox
          disabled={!canUpdateFlags}
          items={memberItems}
          onValueChange={(value) => {
            if (!value) {
              return;
            }
            handleMaintainerUpdate(value);
          }}
          value={comboboxValue}
        >
          <ComboboxTrigger
            render={
              <Button
                className="h-auto w-full justify-start gap-1.5 px-2 py-1.5"
                size="small"
                variant="outline"
              />
            }
          >
            <ComboboxValue>
              {isLoadingMembers && currentMaintainerId ? (
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Avatar className="size-5 border">
                    {selectedMaintainer ? (
                      <>
                        <AvatarImage src={selectedMaintainer.avatar} />
                        <AvatarFallback>
                          {selectedMaintainer.label?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </>
                    ) : (
                      <RiUserSmileLine className="size-3" />
                    )}
                  </Avatar>
                  <Text size="small">
                    {selectedMaintainer?.label ?? "Unassigned"}
                  </Text>
                </div>
              )}
            </ComboboxValue>
            <RiArrowDownSLine className="ml-auto size-4 text-ui-fg-muted" />
          </ComboboxTrigger>
          <ComboboxPopup className="w-full">
            <div className="border-b p-2">
              <ComboboxInput
                aria-label="Select a maintainer"
                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                onChange={(e) => setMaintainerSearchTerm(e.target.value)}
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

      <Separator />

      <div className="flex flex-col gap-1 p-4">
        <Text className="text-ui-fg-muted" size="xsmall" weight="plus">
          Tags
        </Text>
        <div className="flex flex-wrap items-center gap-1">
          {flag.tags?.map((tag) => (
            <Badge className="gap-x-0" key={tag} variant="outline">
              <RiHashtag className="size-3 text-ui-fg-muted" />
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiCalendarFill className="size-4 text-ui-fg-muted" />
            <Text className="text-ui-fg-muted" size="xsmall">
              Created
            </Text>
          </div>
          <Text size="xsmall" weight="plus">
            {dayjs(flag.createdAt).format("MMM DD, YYYY")}
          </Text>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <RiTimeFill className="size-4 text-ui-fg-muted" />
            <Text className="text-ui-fg-muted" size="xsmall">
              Updated
            </Text>
          </div>
          <Text size="xsmall" weight="plus">
            {dayjs(flag.updatedAt).format("MMM DD, YYYY")}
          </Text>
        </div>
      </div>
    </div>
  );
}
