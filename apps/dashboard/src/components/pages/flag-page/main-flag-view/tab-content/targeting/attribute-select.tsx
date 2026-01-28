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
import { useMemo, useState } from "react";
import { useTRPC } from "@/lib/trpc";
import { useTargetingStore } from "./targeting-store";

// Special value for the "create new" option
const CREATE_NEW_VALUE = "__create_new__";

interface AttributeItem {
  value: string;
  label: string;
  subLabel?: string;
}

interface AttributeSelectProps {
  value: string;
  onChange: (key: string) => void;
  projectSlug: string;
  organizationSlug: string;
}

export function AttributeSelect({
  value,
  onChange,
  projectSlug,
  organizationSlug,
}: AttributeSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");

  const attributes = useTargetingStore((s) => s.attributes);
  const attributesByKey = useTargetingStore((s) => s.attributesByKey);

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
      },
    })
  );

  const selectedAttribute = attributesByKey.get(value);

  const attributeItems = useMemo(() => {
    const items: AttributeItem[] = attributes.map((attr) => ({
      value: attr.key,
      label: attr.displayName ?? attr.key,
      subLabel:
        attr.displayName && attr.displayName !== attr.key
          ? attr.key
          : undefined,
    }));

    // Add "Create new" option at the end
    items.push({
      value: CREATE_NEW_VALUE,
      label: "Create new attribute",
    });

    return items;
  }, [attributes]);

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

  const handleValueChange = (newValue: string | null) => {
    if (newValue === CREATE_NEW_VALUE) {
      setIsCreating(true);
      return;
    }
    if (newValue) {
      onChange(newValue);
    }
  };

  return (
    <Combobox
      autoHighlight
      items={attributeItems}
      onValueChange={handleValueChange}
      value={value}
    >
      <ComboboxTrigger
        render={
          <Button
            className="h-7.5 w-36 justify-between"
            size="small"
            variant="outline"
          />
        }
      >
        <ComboboxValue>
          <span className="truncate">
            {selectedAttribute?.displayName ??
              selectedAttribute?.key ??
              "Select"}
          </span>
        </ComboboxValue>
        <RiArrowDownSLine className="ml-1 size-4 shrink-0" />
      </ComboboxTrigger>
      <ComboboxPopup className="w-56">
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
            <div className="border-b p-2">
              <ComboboxInput
                aria-label="Search attributes"
                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search attributes..."
                showTrigger={false}
                value={searchTerm}
              />
            </div>
            <ComboboxEmpty>No attributes found.</ComboboxEmpty>
            <ComboboxList>
              {(item: AttributeItem) =>
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
                      {item.subLabel && (
                        <span className="text-ui-fg-muted text-xs">
                          {item.subLabel}
                        </span>
                      )}
                    </div>
                  </ComboboxItem>
                )
              }
            </ComboboxList>
          </>
        )}
      </ComboboxPopup>
    </Combobox>
  );
}
