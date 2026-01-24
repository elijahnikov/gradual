import type { createCompleteFeatureFlagSchema } from "@gradual/api/schemas";
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
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import { RiArrowDownSLine, RiUserSmileLine } from "@remixicon/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type z from "zod/v4";
import { useTRPC } from "@/lib/trpc";

interface MemberItem {
  value: string | null;
  label: string;
  avatar: string | undefined;
}

export default function Assignee({
  organizationSlug,
  isDialogOpen,
  form,
}: {
  isDialogOpen: boolean;
  organizationSlug: string;
  form: UseFormReturn<z.infer<typeof createCompleteFeatureFlagSchema>>;
}) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const maintainerId = form.watch("maintainerId");

  const trpc = useTRPC();
  const { data: members, isLoading: isLoadingMembers } = useQuery({
    ...trpc.organizationMember.getMembers.queryOptions({
      organizationSlug,
      getWithPermissions: false,
      orderBy: "createdAt",
      orderDirection: "asc",
      limit: 20,
      offset: 0,
      textSearch: searchTerm,
    }),
    enabled: !!organizationSlug && isDialogOpen,
  });

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

  const selectedItem = useMemo(() => {
    if (!maintainerId) {
      return null;
    }
    return memberItems.find((item) => item.value === maintainerId) ?? null;
  }, [maintainerId, memberItems]);

  return (
    <Combobox
      autoHighlight
      items={memberItems}
      onValueChange={(value) => {
        form.setValue(
          "maintainerId",
          value === null ? undefined : (value ?? undefined),
          {
            shouldValidate: true,
          }
        );
      }}
      value={selectedItem?.value ?? null}
    >
      <ComboboxTrigger
        render={
          <Button
            className="w-48 justify-start"
            size="small"
            variant="outline"
          />
        }
      >
        <ComboboxValue>
          {selectedItem ? (
            <div className="flex items-center gap-2">
              {selectedItem.avatar === "no-maintainer" ? (
                <RiUserSmileLine className="size-4" />
              ) : (
                <Avatar className="size-4">
                  <AvatarImage src={selectedItem.avatar} />
                  <AvatarFallback>
                    {selectedItem.label?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <Text size="small">{selectedItem.label}</Text>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <RiUserSmileLine className="size-4 text-muted-foreground" />
              <Text className="text-muted-foreground" size="small">
                Maintainer
              </Text>
            </div>
          )}
        </ComboboxValue>
        <RiArrowDownSLine className="ml-auto size-4" />
      </ComboboxTrigger>
      <ComboboxPopup>
        <div className="border-b p-2">
          <ComboboxInput
            aria-label="Select a maintainer"
            className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search for team member"
            showTrigger={false}
            value={searchTerm}
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
  );
}
