import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Badge } from "@gradual/ui/badge";
import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gradual/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Input } from "@gradual/ui/input";
import { LoadingButton } from "@gradual/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Text } from "@gradual/ui/text";
import { toastManager } from "@gradual/ui/toast";
import {
  RiAddLine,
  RiMoreLine,
  RiShieldUserLine,
  RiUserMinusLine,
} from "@remixicon/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { upperFirst } from "lodash";
import { Suspense, useState } from "react";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

type MemberItem = RouterOutputs["organizationMember"]["getMembers"][number];
type MemberWithPermissions = MemberItem & {
  permissions?: { canDelete: boolean; canUpdateRole: boolean };
};

const _roleBadgeVariant: Record<
  string,
  "default" | "info" | "warning" | "outline"
> = {
  owner: "default",
  admin: "info",
  member: "outline",
  viewer: "outline",
};

export default function MembersSettings() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Text className="text-ui-fg-muted" size="small">
            Loading...
          </Text>
        </div>
      }
    >
      <MembersSettingsContent />
    </Suspense>
  );
}

function MembersSettingsContent() {
  const trpc = useTRPC();
  const { organizationSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/settings/",
  });
  const { canInviteMembers } = usePermissions();

  const { data: members } = useSuspenseQuery(
    trpc.organizationMember.getMembers.queryOptions({
      organizationSlug,
      getWithPermissions: true,
      limit: 100,
    })
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex h-12 min-h-12 items-center justify-between border-b bg-ui-bg-subtle px-4 py-2">
        <Text className="text-ui-fg-muted" size="xsmall">
          {members.length} {members.length === 1 ? "member" : "members"}
        </Text>
        <PermissionTooltip hasPermission={canInviteMembers}>
          <Button
            className="gap-x-1"
            disabled={!canInviteMembers}
            size="small"
            variant="outline"
          >
            <RiAddLine className="size-3.5" />
            <span className="text-xs">Invite member</span>
          </Button>
        </PermissionTooltip>
      </div>
      <div className="flex flex-col">
        {members.map((member) => (
          <MemberRow key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}

function MemberRow({ member }: { member: MemberWithPermissions }) {
  const permissions = (member as MemberWithPermissions).permissions;
  const hasActions = permissions?.canUpdateRole || permissions?.canDelete;

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <Avatar className="size-8">
        <AvatarImage
          alt={member.user.name ?? ""}
          src={member.user.image ?? undefined}
        />
        <AvatarFallback className="text-xs">
          {getInitials(member.user.name)}
        </AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <Text className="truncate" size="small" weight="plus">
          {member.user.name}
        </Text>
        <Text className="truncate text-ui-fg-muted" size="xsmall">
          {member.user.email}
        </Text>
      </div>
      <Badge size="default" variant={"outline"}>
        {upperFirst(member.role)}
      </Badge>
      {hasActions && <MemberActions member={member as MemberWithPermissions} />}
    </div>
  );
}

function MemberActions({ member }: { member: MemberWithPermissions }) {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);

  const canUpdateRole = member.permissions?.canUpdateRole;
  const canDelete = member.permissions?.canDelete;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button className="size-7" size="small" variant="ghost" />}
        >
          <RiMoreLine className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canUpdateRole && (
            <DropdownMenuItem onClick={() => setRoleDialogOpen(true)}>
              <RiShieldUserLine className="mr-2 size-4" />
              Change role
            </DropdownMenuItem>
          )}
          {canUpdateRole && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem
              className="text-ui-fg-error"
              onClick={() => setRemoveDialogOpen(true)}
            >
              <RiUserMinusLine className="mr-2 size-4" />
              Remove member
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangeRoleDialog
        member={member}
        onOpenChange={setRoleDialogOpen}
        open={roleDialogOpen}
      />
      <RemoveMemberDialog
        member={member}
        onOpenChange={setRemoveDialogOpen}
        open={removeDialogOpen}
      />
    </>
  );
}

function ChangeRoleDialog({
  member,
  open,
  onOpenChange,
}: {
  member: MemberWithPermissions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [role, setRole] = useState(member.role);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: updateRole, isPending } = useMutation(
    trpc.organizationMember.updateMemberRole.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.organizationMember.pathFilter());
      },
    })
  );

  const handleSubmit = async () => {
    try {
      await updateRole({
        id: member.id,
        organizationId: member.organizationId,
        role,
        userId: member.userId,
      });
      toastManager.add({
        title: "Role updated",
        description: `${member.user.name}'s role has been changed to ${role}`,
        type: "success",
      });
      onOpenChange(false);
    } catch {
      toastManager.add({
        title: "Failed to update role",
        description: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <Dialog
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setRole(member.role);
        }
      }}
      open={open}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            Change role
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4">
          <Text className="text-ui-fg-muted" size="small">
            Change the role of{" "}
            <span className="font-semibold text-ui-fg-base">
              {member.user.name}
            </span>
          </Text>
          <Select
            onValueChange={(v) => {
              if (v) {
                setRole(v);
              }
            }}
            value={role}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter className="border-t p-4">
          <Button
            onClick={() => onOpenChange(false)}
            size="small"
            variant="outline"
          >
            Cancel
          </Button>
          <LoadingButton
            disabled={role === member.role}
            loading={isPending}
            onClick={handleSubmit}
            size="small"
            variant="gradual"
          >
            Save
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveMemberDialog({
  member,
  open,
  onOpenChange,
}: {
  member: MemberWithPermissions;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [confirmValue, setConfirmValue] = useState("");
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { mutateAsync: removeMember, isPending } = useMutation(
    trpc.organizationMember.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.organizationMember.pathFilter());
      },
    })
  );

  const handleDelete = async () => {
    try {
      await removeMember({
        id: member.id,
        organizationId: member.organizationId,
      });
      toastManager.add({
        title: "Member removed",
        description: `${member.user.name} has been removed from the organization`,
        type: "success",
      });
      onOpenChange(false);
    } catch {
      toastManager.add({
        title: "Failed to remove member",
        description: "Please try again",
        type: "error",
      });
    }
  };

  return (
    <Dialog
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setConfirmValue("");
        }
      }}
      open={open}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            Remove member
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4">
          <Text className="text-ui-fg-muted" size="small">
            Are you sure you want to remove{" "}
            <span className="font-semibold text-ui-fg-base">
              {member.user.name}
            </span>{" "}
            from the organization? This action cannot be undone.
          </Text>
          <div className="flex flex-col gap-1.5">
            <Text className="text-xs" size="xsmall">
              Type <span className="font-semibold">{member.user.email}</span> to
              confirm
            </Text>
            <Input
              onChange={(e) => setConfirmValue(e.target.value)}
              placeholder={member.user.email}
              value={confirmValue}
            />
          </div>
        </div>
        <DialogFooter className="border-t p-4">
          <Button
            onClick={() => onOpenChange(false)}
            size="small"
            variant="outline"
          >
            Cancel
          </Button>
          <LoadingButton
            disabled={confirmValue !== member.user.email}
            loading={isPending}
            onClick={handleDelete}
            size="small"
            variant="destructive"
          >
            Remove member
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function getInitials(name: string | null): string {
  if (!name) {
    return "?";
  }
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
