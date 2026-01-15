"use client";

import { cn } from "@gradual/ui";
import { Button } from "@gradual/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gradual/ui/tooltip";
import { RiCheckFill, RiFileCopyLine } from "@remixicon/react";
import { useState } from "react";

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label={copied ? "Copied" : "Copy to clipboard"}
            className="size-6 disabled:opacity-100"
            disabled={copied}
            onClick={handleCopy}
            size="small"
            variant="outline"
          />
        }
      >
        <div
          className={cn(
            "transition-all",
            copied ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )}
        >
          <RiCheckFill
            aria-hidden="true"
            className="stroke-emerald-500"
            size={16}
          />
        </div>
        <div
          className={cn(
            "absolute transition-all",
            copied ? "scale-0 opacity-0" : "scale-100 opacity-100"
          )}
        >
          <RiFileCopyLine aria-hidden="true" size={16} />
        </div>
      </TooltipTrigger>
      <TooltipContent className="px-2 py-1 text-xs">
        Click to copy
      </TooltipContent>
    </Tooltip>
  );
}
