import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Input } from "@gradual/ui/input";
import { Text } from "@gradual/ui/text";
import { RiAddLine, RiArrowDownSLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc";
import type { Attribute } from "./types";

interface AttributeSelectProps {
  attributes: Attribute[];
  value: string;
  onChange: (key: string) => void;
  projectSlug: string;
  organizationSlug: string;
}

export function AttributeSelect({
  attributes,
  value,
  onChange,
  projectSlug,
  organizationSlug,
}: AttributeSelectProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [open, setOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.attributes.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [["attributes", "list"]] });
        onChange(data?.key ?? newKey);
        setIsCreating(false);
        setNewKey("");
        setNewDisplayName("");
        setOpen(false);
      },
    })
  );

  const selectedAttribute = attributes.find((a) => a.key === value);

  const handleCreate = () => {
    if (!(newKey.trim() && newDisplayName.trim())) {
      return;
    }

    createMutation.mutate({
      key: newKey,
      displayName: newDisplayName,
      type: "string",
      projectSlug,
      organizationSlug,
    });
  };

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger>
        <Button
          className="h-7.5 w-36 justify-between"
          size="small"
          variant="outline"
        >
          <span className="truncate">
            {selectedAttribute?.displayName ??
              selectedAttribute?.key ??
              "Select"}
          </span>
          <RiArrowDownSLine className="ml-1 size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {isCreating ? (
          <div className="flex flex-col gap-2 p-2">
            <Text size="small" weight="plus">
              Create new attribute
            </Text>
            <Input
              className="h-8"
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="key (e.g., userId)"
              value={newKey}
            />
            <Input
              className="h-8"
              onChange={(e) => setNewDisplayName(e.target.value)}
              placeholder="Display name"
              value={newDisplayName}
            />
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => setIsCreating(false)}
                size="small"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={
                  !(newKey.trim() && newDisplayName.trim()) ||
                  createMutation.isPending
                }
                onClick={handleCreate}
                size="small"
                variant="default"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {attributes.map((attr) => (
              <DropdownMenuItem
                key={attr.key}
                onClick={() => {
                  onChange(attr.key);
                  setOpen(false);
                }}
              >
                <div className="flex flex-col">
                  <span>{attr.displayName ?? attr.key}</span>
                  {attr.displayName && attr.displayName !== attr.key && (
                    <span className="text-ui-fg-muted text-xs">{attr.key}</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsCreating(true)}>
              <RiAddLine className="mr-2 size-4" />
              Create new attribute
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
