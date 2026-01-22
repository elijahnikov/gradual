"use client";

import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import {
  RiCollapseDiagonalFill,
  RiDeleteBinFill,
  RiExpandDiagonalFill,
  RiFileCopyLine,
  RiFileDownloadFill,
  RiFileUploadFill,
  RiMagicFill,
} from "@remixicon/react";

import type React from "react";
import { useCallback, useRef, useState } from "react";

interface JsonEditorProps {
  initialValue?: string;
  onChange?: (value: string, isValid: boolean) => void;
  showToolbar?: boolean;
  showFooter?: boolean;
}

export function JsonEditor({
  initialValue = "",
  onChange,
  showToolbar = false,
  showFooter = false,
}: JsonEditorProps) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isMinified, setIsMinified] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const validateJson = useCallback(
    (text: string): { valid: boolean; error: string | null } => {
      if (!text.trim()) {
        return { valid: true, error: null };
      }
      try {
        JSON.parse(text);
        return { valid: true, error: null };
      } catch (e) {
        if (e instanceof SyntaxError) {
          return { valid: false, error: e.message };
        }
        return { valid: false, error: "Invalid JSON" };
      }
    },
    []
  );

  const handleChange = useCallback(
    (text: string) => {
      setValue(text);
      const result = validateJson(text);
      setIsValid(result.valid);
      setError(result.error);
      onChange?.(text, result.valid);
    },
    [validateJson, onChange]
  );

  const formatJson = useCallback(() => {
    if (!value.trim()) {
      return;
    }
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      setValue(formatted);
      setIsMinified(false);
      setIsValid(true);
      setError(null);
      onChange?.(formatted, true);
    } catch (_) {
      //
    }
  }, [value, onChange]);

  const minifyJson = useCallback(() => {
    if (!value.trim()) {
      return;
    }
    try {
      const parsed = JSON.parse(value);
      const minified = JSON.stringify(parsed);
      setValue(minified);
      setIsMinified(true);
      setIsValid(true);
      setError(null);
      onChange?.(minified, true);
    } catch {
      console.error("Failed to minify JSON");
    }
  }, [value, onChange]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      console.error("Failed to copy to clipboard");
    }
  }, [value]);

  const downloadJson = useCallback(() => {
    if (!value.trim()) {
      return;
    }
    const blob = new Blob([value], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [value]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleChange(text);
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [handleChange]
  );

  const clearEditor = useCallback(() => {
    setValue("");
    setError(null);
    setIsValid(true);
    onChange?.("", true);
  }, [onChange]);

  const lineCount = value.split("\n").length;

  return (
    <div className="mx-auto w-full max-w-4xl">
      {showToolbar && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg p-2">
          <Button
            className="gap-1.5"
            disabled={!(value.trim() && isValid)}
            onClick={formatJson}
            size="small"
            variant="ghost"
          >
            <RiMagicFill className="h-4 w-4" />
            Format
          </Button>
          <Button
            className="gap-1.5"
            disabled={!(value.trim() && isValid)}
            onClick={isMinified ? formatJson : minifyJson}
            size="small"
            variant="ghost"
          >
            {isMinified ? (
              <>
                <RiExpandDiagonalFill className="h-4 w-4" />
                Expand
              </>
            ) : (
              <>
                <RiCollapseDiagonalFill className="h-4 w-4" />
                Minify
              </>
            )}
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            className="gap-1.5"
            disabled={!value.trim()}
            onClick={copyToClipboard}
            size="small"
            variant="ghost"
          >
            <RiFileCopyLine className="h-4 w-4" />
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button
            className="gap-1.5"
            disabled={!(value.trim() && isValid)}
            onClick={downloadJson}
            size="small"
            variant="ghost"
          >
            <RiFileDownloadFill className="h-4 w-4" />
            Download
          </Button>
          <Button
            className="gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            size="small"
            variant="ghost"
          >
            <RiFileUploadFill className="h-4 w-4" />
            Upload
          </Button>
          <input
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileUpload}
            ref={fileInputRef}
            type="file"
          />
          <div className="flex-1" />
          <Button
            className="gap-1.5 text-muted-foreground hover:text-destructive"
            disabled={!value.trim()}
            onClick={clearEditor}
            size="small"
            variant="ghost"
          >
            <RiDeleteBinFill className="h-4 w-4" />
            Clear
          </Button>
        </div>
      )}

      <Card className="group relative p-0">
        {!showToolbar && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    className="absolute top-1 right-1 size-6 gap-1.5 opacity-0 transition-opacity duration-100 group-hover:opacity-100"
                    disabled={!(value.trim() && isValid)}
                    onClick={formatJson}
                    size="small"
                    variant="outline"
                  />
                }
              >
                <RiMagicFill className="size-4 shrink-0" />
              </TooltipTrigger>
              <TooltipContent>Format</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div
          className="flex h-max max-h-[600px] overflow-y-auto"
          ref={scrollContainerRef}
        >
          <div className="h-full min-w-12 select-none border-border border-r bg-muted/30 px-2 py-4 text-right font-mono text-muted-foreground text-sm">
            {Array.from({ length: lineCount }, (_, i) => (
              <div className="px-1 leading-6" key={i + 1}>
                {i + 1}
              </div>
            ))}
          </div>
          <textarea
            className={cn(
              "flex-1 resize-none overflow-y-hidden bg-transparent p-4 font-mono text-foreground text-sm leading-6 outline-none placeholder:text-muted-foreground",
              !isValid && value.trim() && "text-destructive"
            )}
            onChange={(e) => handleChange(e.target.value)}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${target.scrollHeight}px`;
            }}
            placeholder='{"key": "value"}'
            ref={textareaRef}
            spellCheck={false}
            style={{ height: "auto" }}
            value={value}
            wrap="off"
          />
        </div>
      </Card>

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2">
          <Text className="font-mono text-ui-fg-error text-xs">{error}</Text>
        </div>
      )}

      {showFooter && (
        <div className="mt-3 flex items-center justify-between text-muted-foreground text-xs">
          <span>
            {lineCount} {lineCount === 1 ? "line" : "lines"} · {value.length}{" "}
            characters
          </span>
          {value.trim() && isValid && (
            <span>
              {(() => {
                try {
                  const parsed = JSON.parse(value);
                  if (Array.isArray(parsed)) {
                    return `Array with ${parsed.length} items`;
                  }
                  if (typeof parsed === "object" && parsed !== null) {
                    return `Object with ${Object.keys(parsed).length} keys`;
                  }
                  return typeof parsed;
                } catch {
                  return "";
                }
              })()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
