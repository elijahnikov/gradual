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
import type { ContextKind } from "./types";

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
  contextKind?: ContextKind;
}

export function AttributeSelect({
  value,
  onChange,
  projectSlug,
  organizationSlug,
  contextKind,
}: AttributeSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [open, setOpen] = useState(false);

  const preventCloseRef = useRef(false);

  const attributesByKey = useTargetingStore((s) => s.attributesByKey);
  const attributesByContextKind = useTargetingStore(
    (s) => s.attributesByContextKind
  );

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

  const selectedAttribute = attributesByKey.get(value);

  const attributeItems = useMemo((): AttributeItem[] => {
    const attrs = contextKind
      ? (attributesByContextKind.get(contextKind) ?? [])
      : Array.from(attributesByContextKind.values()).flat();

    return attrs.map((attr) => ({
      value: attr.key,
      label: attr.displayName ?? attr.key,
      subLabel:
        attr.displayName && attr.displayName !== attr.key
          ? attr.key
          : undefined,
    }));
  }, [attributesByContextKind, contextKind]);

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

  const handleCancel = () => {
    preventCloseRef.current = false;
    setIsCreating(false);
    setNewKey("");
    setNewDisplayName("");
  };

  const isDisabled = !contextKind;

  const handleOpenChange = (newOpen: boolean) => {
    if (isDisabled) {
      return;
    }

    if (!newOpen && preventCloseRef.current) {
      preventCloseRef.current = false;
      return;
    }

    setOpen(newOpen);
    if (!newOpen) {
      setIsCreating(false);
      setNewKey("");
      setNewDisplayName("");
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
      items={attributeItems}
      onOpenChange={handleOpenChange}
      onValueChange={handleValueChange}
      open={open}
      value={value}
    >
      <ComboboxTrigger
        disabled={isDisabled}
        render={
          <Button
            className="h-7 w-full justify-between rounded-sm sm:w-36"
            disabled={isDisabled}
            size="small"
            variant="outline"
          />
        }
      >
        <ComboboxValue>
          <span className="truncate font-normal text-ui-fg-base">
            {isDisabled
              ? "Select context first"
              : (selectedAttribute?.displayName ??
                selectedAttribute?.key ??
                "Select attribute")}
          </span>
        </ComboboxValue>
        <RiArrowDownSLine className="ml-1 size-4 shrink-0" />
      </ComboboxTrigger>
      <ComboboxPopup className="w-56 overflow-x-hidden">
        {isCreating ? (
          <div className="flex w-56 flex-col gap-2 p-2">
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
                onClick={handleCancel}
                size="small"
                variant="secondary"
              >
                Cancel
              </Button>
              <LoadingButton
                className="flex-1"
                disabled={
                  !(newKey.trim() && newDisplayName.trim()) ||
                  createMutation.isPending
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
                aria-label="Search attributes"
                className="rounded-md before:rounded-[calc(var(--radius-md)-1px)]"
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search attributes..."
                showTrigger={false}
                value={searchTerm}
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              <ComboboxEmpty>
                {contextKind
                  ? "No attributes in this context."
                  : "No attributes found."}
              </ComboboxEmpty>
              <ComboboxList>
                {(item: AttributeItem) => (
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
              <span>Create new attribute</span>
            </button>
          </div>
        )}
      </ComboboxPopup>
    </Combobox>
  );
}
