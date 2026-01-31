import { cn } from "@gradual/ui";
import { useCallback, useEffect, useRef, useState } from "react";

export default function EditableDescription({
  description,
  updateCallback,
  loading = false,
  placeholder = "Add a description...",
}: {
  description: string | null;
  updateCallback: (description: string | null) => void;
  loading?: boolean;
  placeholder?: string;
}) {
  const [value, setValue] = useState(description ?? "");
  const lastSavedValue = useRef(description ?? "");

  useEffect(() => {
    setValue(description ?? "");
    lastSavedValue.current = description ?? "";
  }, [description]);

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed !== lastSavedValue.current) {
      lastSavedValue.current = trimmed;
      updateCallback(trimmed || null);
    }
  }, [value, updateCallback]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSave();
        e.currentTarget.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setValue(lastSavedValue.current);
        e.currentTarget.blur();
      }
    },
    [handleSave]
  );

  return (
    <textarea
      className={cn(
        "field-sizing-content w-full resize-none bg-transparent font-medium text-sm text-ui-fg-muted leading-5.5 placeholder:text-ui-fg-muted/50 focus:outline-none",
        loading && "animate-pulse"
      )}
      disabled={loading}
      onBlur={handleSave}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={1}
      value={value}
    />
  );
}
