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
import { Input } from "@gradual/ui/input";
import { LoadingButton } from "@gradual/ui/loading-button";
import { Separator } from "@gradual/ui/separator";
import { Text } from "@gradual/ui/text";
import { RiAddLine, RiArrowDownSLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { useTargetingStore } from "./targeting-store";

interface SegmentItem {
  value: string;
  label: string;
  description?: string;
}

interface SegmentSelectProps {
  value: string;
  onChange: (id: string) => void;
  projectSlug: string;
  organizationSlug: string;
}

export function SegmentSelect({
  value,
  onChange,
  projectSlug,
  organizationSlug,
}: SegmentSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [open, setOpen] = useState(false);

  const preventCloseRef = useRef(false);

  const segments = useTargetingStore((s) => s.segments);
  const segmentsById = useTargetingStore((s) => s.segmentsById);

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

  const selectedSegment = segmentsById.get(value);

  const segmentItems = useMemo(() => {
    return segments.map((seg) => ({
      value: seg.id,
      label: seg.name,
      description: seg.description ?? undefined,
    }));
  }, [segments]);

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

  const handleCancel = () => {
    preventCloseRef.current = false;
    setIsCreating(false);
    setNewKey("");
    setNewName("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && preventCloseRef.current) {
      preventCloseRef.current = false;
      return;
    }

    setOpen(newOpen);
    if (!newOpen) {
      setIsCreating(false);
      setNewKey("");
      setNewName("");
      setSearchTerm("");
    }
  };

  const handleValueChange = (newValue: string | null) => {
    if (newValue) {
      onChange(newValue);
      setOpen(false);
    }
  };

  const handleCreateClick = () => {
    preventCloseRef.current = true;
    setIsCreating(true);
  };

  return (
    <Combobox
      autoHighlight
      items={segmentItems}
      onOpenChange={handleOpenChange}
      onValueChange={handleValueChange}
      open={open}
      value={value}
    >
      <ComboboxTrigger
        render={
          <Button
            className="h-7 w-full justify-between sm:w-48"
            size="small"
            variant="outline"
          />
        }
      >
        <ComboboxValue>
          <span className="truncate">
            {selectedSegment?.name ?? "Select segment"}
          </span>
        </ComboboxValue>
        <RiArrowDownSLine className="ml-1 size-4 shrink-0" />
      </ComboboxTrigger>
      <ComboboxPopup className="w-56 overflow-x-hidden">
        {isCreating ? (
          <div className="flex w-56 flex-col gap-2 p-2">
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
                onClick={handleCancel}
                size="small"
                variant="secondary"
              >
                Cancel
              </Button>
              <LoadingButton
                className="flex-1"
                disabled={
                  !(newKey.trim() && newName.trim()) || createMutation.isPending
                }
                loading={createMutation.isPending}
                onClick={handleCreate}
                size="small"
                variant="default"
              >
                Create
              </LoadingButton>
            </div>
          </div>
        ) : (
          <div className="flex w-56 flex-col">
            <div className="w-full p-2">
              <ComboboxInput
                aria-label="Search segments"
                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search segments..."
                showTrigger={false}
                value={searchTerm}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              <ComboboxEmpty>
                {segments.length === 0
                  ? "No segments yet."
                  : "No segments found."}
              </ComboboxEmpty>
              <ComboboxList>
                {(item: SegmentItem) => (
                  <ComboboxItem key={item.value} value={item.value}>
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.description && (
                        <span className="text-ui-fg-muted text-xs">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </div>
            <Separator />
            <button
              className="flex items-center gap-2 rounded-b-md px-3 py-2 text-sm hover:bg-ui-bg-component-hover"
              onClick={handleCreateClick}
              type="button"
            >
              <RiAddLine className="size-4" />
              <span>Create new segment</span>
            </button>
          </div>
        )}
      </ComboboxPopup>
    </Combobox>
  );
}
