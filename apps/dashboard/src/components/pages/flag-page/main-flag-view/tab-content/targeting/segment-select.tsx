import { Button } from "@gradual/ui/button";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "@gradual/ui/combobox";
import { Input } from "@gradual/ui/input";
import { Text } from "@gradual/ui/text";
import { RiAddLine, RiArrowDownSLine } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { useTargetingStore } from "./targeting-store";

// Special value for the "create new" option
const CREATE_NEW_VALUE = "__create_new__";

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
    const items: SegmentItem[] = segments.map((seg) => ({
      value: seg.id,
      label: seg.name,
      description: seg.description ?? undefined,
    }));

    items.push({
      value: CREATE_NEW_VALUE,
      label: "Create new segment",
    });

    return items;
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
    if (newValue === CREATE_NEW_VALUE) {
      preventCloseRef.current = true;
      setIsCreating(true);
      return;
    }
    if (newValue) {
      onChange(newValue);
      setOpen(false);
    }
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
            className="h-8 w-48 justify-between"
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
      <ComboboxPopup className="w-56">
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
          <div className="w-56">
            <div className="p-2">
              <ComboboxInput
                aria-label="Search segments"
                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search segments..."
                showTrigger={false}
                value={searchTerm}
              />
            </div>
            <ComboboxEmpty>
              {segments.length === 0
                ? "No segments yet."
                : "No segments found."}
            </ComboboxEmpty>
            <ComboboxList>
              {(item: SegmentItem) =>
                item.value === CREATE_NEW_VALUE ? (
                  <>
                    <ComboboxSeparator />
                    <ComboboxItem key={item.value} value={item.value}>
                      <div className="flex items-center gap-2">
                        <RiAddLine className="size-4" />
                        <span>{item.label}</span>
                      </div>
                    </ComboboxItem>
                  </>
                ) : (
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
                )
              }
            </ComboboxList>
          </div>
        )}
      </ComboboxPopup>
    </Combobox>
  );
}
