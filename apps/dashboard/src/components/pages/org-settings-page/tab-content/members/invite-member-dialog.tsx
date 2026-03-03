import { Button } from "@gradual/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gradual/ui/dialog";
import { Input } from "@gradual/ui/input";
import { Label } from "@gradual/ui/label";
import { LoadingButton } from "@gradual/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { toastManager } from "@gradual/ui/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import _ from "lodash";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";

export default function InviteMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { organizationSlug } = useParams({ strict: false });

  const { mutateAsync: createInvitation, isPending } = useMutation(
    trpc.invitation.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.invitation.pathFilter());
      },
    })
  );

  const handleSubmit = async () => {
    try {
      await createInvitation({
        organizationSlug: organizationSlug as string,
        email,
        role: role as "owner" | "admin" | "member",
      });
      toastManager.add({
        title: "Invitation sent",
        description: `An invitation has been sent to ${email}`,
        type: "success",
      });
      onOpenChange(false);
      setEmail("");
      setRole("member");
    } catch {
      toastManager.add({
        title: "Failed to send invitation",
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
          setEmail("");
          setRole("member");
        }
      }}
      open={open}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-medium text-[14px]">
            Invite member
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div className="flex items-end gap-2 p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Label className="text-xs">Email address</Label>
              <Input
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                type="email"
                value={email}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Role</Label>
              <Select
                onValueChange={(v) => {
                  if (v) {
                    setRole(v);
                  }
                }}
                value={role}
              >
                <SelectTrigger>
                  <SelectValue>{_.upperFirst(role)}</SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t p-4">
            <Button
              onClick={() => onOpenChange(false)}
              size="small"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <LoadingButton
              disabled={!email}
              loading={isPending}
              size="small"
              type="submit"
              variant="gradual"
            >
              Send invitation
            </LoadingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
