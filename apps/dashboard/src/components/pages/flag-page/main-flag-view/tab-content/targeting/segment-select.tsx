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
import type { Segment } from "./types";

interface SegmentSelectProps {
  segments: Segment[];
  value: string;
  onChange: (id: string) => void;
  projectSlug: string;
  organizationSlug: string;
}

export function SegmentSelect({
  segments,
  value,
  onChange,
  projectSlug,
  organizationSlug,
}: SegmentSelectProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createMutation = useMutation(
    trpc.segments.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: [["segments", "list"]] });
        if (data) {
          onChange(data.id);
        }
        setIsCreating(false);
        setNewKey("");
        setNewName("");
        setOpen(false);
      },
    })
  );

  const selectedSegment = segments.find((s) => s.id === value);

  const handleCreate = () => {
    if (!(newKey.trim() && newName.trim())) {
      return;
    }

    createMutation.mutate({
      key: newKey,
      name: newName,
      conditions: [],
      projectSlug,
      organizationSlug,
    });
  };

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger>
        <Button
          className="h-8 w-48 justify-between"
          size="small"
          variant="secondary"
        >
          <span className="truncate">
            {selectedSegment?.name ?? "Select segment"}
          </span>
          <RiArrowDownSLine className="ml-1 size-4 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {isCreating ? (
          <div className="flex flex-col gap-2 p-2">
            <Text size="small" weight="plus">
              Create new segment
            </Text>
            <Input
              className="h-8"
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name (e.g., Beta Users)"
              value={newName}
            />
            <Input
              className="h-8"
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Key (e.g., beta-users)"
              value={newKey}
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
                  !(newKey.trim() && newName.trim()) || createMutation.isPending
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
            {segments.length === 0 ? (
              <div className="p-2">
                <Text className="text-ui-fg-muted" size="small">
                  No segments yet
                </Text>
              </div>
            ) : (
              segments.map((seg) => (
                <DropdownMenuItem
                  key={seg.id}
                  onClick={() => {
                    onChange(seg.id);
                    setOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span>{seg.name}</span>
                    {seg.description && (
                      <span className="text-ui-fg-muted text-xs">
                        {seg.description}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsCreating(true)}>
              <RiAddLine className="mr-2 size-4" />
              Create new segment
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
