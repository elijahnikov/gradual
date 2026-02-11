import { Badge } from "@gradual/ui/badge";
import CopyButton from "@gradual/ui/copy-button";
import { Separator } from "@gradual/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetPanel,
  SheetTitle,
} from "@gradual/ui/sheet";
import { TooltipProvider } from "@gradual/ui/tooltip";
import dayjs from "dayjs";
import { useRef } from "react";
import {
  formatStructuredReason,
  isStructuredReason,
  type StructuredReason,
  structuredReasonVariants,
} from "./reason-utils";

interface EventDetailSheetProps {
  event: {
    id: string;
    variationId: string | null;
    variationName: string | null;
    variationColor: string | null;
    value: unknown;
    reasons: unknown[] | null;
    matchedTargetName: string | null;
    evaluationDurationUs: number | null;
    sdkPlatform: string | null;
    sdkVersion: string | null;
    userAgent: string | null;
    createdAt: Date;
    evaluatedAt: Date | null;
    ruleId: string | null;
    flagConfigVersion: number | null;
    errorDetail: string | null;
    isAnonymous: boolean | null;
    inputsUsed: string[] | null;
    traceId: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) {
    return "null";
  }
  if (typeof val === "object") {
    return JSON.stringify(val, null, 2);
  }
  return String(val);
}

function isJsonValue(val: unknown): boolean {
  return typeof val === "object" && val !== null;
}

function DetailRow({
  label,
  children,
  mono = false,
  copyText,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  copyText?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="shrink-0 font-medium text-ui-fg-base text-xs">
        {label}
      </span>
      <div className="group flex min-w-0 items-center gap-2 overflow-hidden pr-1">
        <Badge
          className={`min-h-max bg-ui-bg-subtle px-1 py-px text-right text-xs ${mono ? "font-mono" : ""} max-w-72 whitespace-break-spaces`}
          variant="outline"
        >
          {children}
        </Badge>
        {copyText && (
          <CopyButton
            className="size-4 shrink-0 [&_svg]:size-3"
            text={copyText}
          />
        )}
      </div>
    </div>
  );
}

function ReasonDetail({ reasons }: { reasons: StructuredReason[] }) {
  return (
    <div className="flex flex-col gap-2">
      {reasons.map((r, i) => {
        const variant = structuredReasonVariants[r.type] ?? "outline";
        return (
          <div
            className="flex items-start gap-3 rounded-md border bg-ui-bg-field p-3"
            key={i}
          >
            <Badge className="mt-0.5 shrink-0" size="sm" variant={variant}>
              {r.type.replace("_", " ")}
            </Badge>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs">{formatStructuredReason(r)}</span>
              {r.type === "rule_match" && r.ruleId && (
                <span className="font-mono text-[10px] text-ui-fg-muted">
                  {r.ruleId}
                </span>
              )}
              {r.type === "percentage_rollout" && r.bucket != null && (
                <span className="text-[10px] text-ui-fg-muted">
                  Bucket: {r.bucket.toLocaleString()} / 100,000
                </span>
              )}
              {r.type === "error" && r.detail && (
                <span className="text-[10px] text-destructive-foreground">
                  {r.detail}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function EventDetailSheet({
  event,
  open,
  onOpenChange,
}: EventDetailSheetProps) {
  const lastEventRef = useRef(event);
  if (event) {
    lastEventRef.current = event;
  }
  const displayEvent = event ?? lastEventRef.current;

  const reasons =
    displayEvent && Array.isArray(displayEvent.reasons)
      ? displayEvent.reasons.filter(isStructuredReason)
      : [];

  const valueStr = displayEvent ? formatValue(displayEvent.value) : "";
  const isJson = displayEvent ? isJsonValue(displayEvent.value) : false;

  return (
    <TooltipProvider>
      <Sheet onOpenChange={onOpenChange} open={open}>
        <SheetContent showCloseButton side="right">
          <SheetHeader className="border-b p-0 px-4 pt-4 pb-5">
            <div className="flex items-center gap-2">
              {displayEvent?.variationColor && (
                <span
                  className="size-3 shrink-0 rounded-[4px]"
                  style={{ backgroundColor: displayEvent.variationColor }}
                />
              )}
              <SheetTitle className="font-medium">
                {displayEvent?.variationName ?? "Unknown variation"}
              </SheetTitle>
              {displayEvent?.isAnonymous && (
                <Badge size="sm" variant="secondary">
                  Anonymous
                </Badge>
              )}
            </div>
            <span className="font-medium font-mono text-ui-fg-muted text-xs">
              {displayEvent
                ? dayjs(displayEvent.createdAt).format(
                    "MMMM D, YYYY [at] HH:mm:ss"
                  )
                : ""}
            </span>
          </SheetHeader>
          <SheetPanel className="p-0">
            {displayEvent && (
              <div className="flex flex-col gap-5">
                <section className="px-4 pt-4">
                  <h3 className="mb-2 font-medium text-[11px] text-ui-fg-muted uppercase tracking-wider">
                    Decision
                  </h3>
                  <ReasonDetail reasons={reasons} />
                  {displayEvent.matchedTargetName && (
                    <div className="mt-2 -mb-2">
                      <DetailRow label="Target" mono>
                        {displayEvent.matchedTargetName}
                      </DetailRow>
                    </div>
                  )}
                </section>

                <Separator />

                <section className="px-4 pt-0">
                  <h3 className="mb-2 font-medium text-[11px] text-ui-fg-muted uppercase tracking-wider">
                    Value
                  </h3>
                  {isJson ? (
                    <div className="relative">
                      <pre className="overflow-auto rounded-md border bg-ui-bg-field p-3 font-mono text-xs leading-relaxed">
                        {valueStr}
                      </pre>
                      <div className="absolute top-2 right-2">
                        <CopyButton text={valueStr} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="rounded-md border bg-ui-bg-field px-2.5 py-1.5 font-mono text-xs">
                        {valueStr}
                      </code>
                      <CopyButton text={valueStr} />
                    </div>
                  )}
                </section>

                <Separator />

                <section className="px-4 pt-0">
                  <h3 className="mb-1 font-medium text-[11px] text-ui-fg-muted uppercase tracking-wider">
                    Metadata
                  </h3>
                  <div className="flex flex-col">
                    <DetailRow
                      copyText={displayEvent.id}
                      label="Evaluation ID"
                      mono
                    >
                      <span className="cursor-default">{displayEvent.id}</span>
                    </DetailRow>
                    {displayEvent.variationId && (
                      <DetailRow
                        copyText={displayEvent.variationId}
                        label="Variation ID"
                        mono
                      >
                        <span className="cursor-default">
                          {displayEvent.variationId}
                        </span>
                      </DetailRow>
                    )}
                    {displayEvent.ruleId && (
                      <DetailRow
                        copyText={displayEvent.ruleId}
                        label="Rule ID"
                        mono
                      >
                        <span className="cursor-default">
                          {displayEvent.ruleId}
                        </span>
                      </DetailRow>
                    )}
                    {displayEvent.evaluationDurationUs != null && (
                      <DetailRow
                        copyText={String(displayEvent.evaluationDurationUs)}
                        label="Duration"
                      >
                        {(displayEvent.evaluationDurationUs / 1000).toFixed(2)}
                        ms
                      </DetailRow>
                    )}
                    {displayEvent.flagConfigVersion != null && (
                      <DetailRow
                        copyText={String(displayEvent.flagConfigVersion)}
                        label="Config version"
                        mono
                      >
                        {displayEvent.flagConfigVersion}
                      </DetailRow>
                    )}
                    {displayEvent.traceId && (
                      <DetailRow
                        copyText={displayEvent.traceId}
                        label="Trace ID"
                        mono
                      >
                        <span className="cursor-default">
                          {displayEvent.traceId}
                        </span>
                      </DetailRow>
                    )}
                    {displayEvent.inputsUsed &&
                      displayEvent.inputsUsed.length > 0 && (
                        <DetailRow
                          copyText={displayEvent.inputsUsed.join(", ")}
                          label="Inputs used"
                          mono
                        >
                          {displayEvent.inputsUsed.join(", ")}
                        </DetailRow>
                      )}
                  </div>
                </section>

                <Separator />

                <section className="px-4 pt-0">
                  <h3 className="mb-1 font-medium text-[11px] text-ui-fg-muted uppercase tracking-wider">
                    SDK
                  </h3>
                  <div className="flex flex-col">
                    {displayEvent.sdkPlatform && (
                      <DetailRow
                        copyText={displayEvent.sdkPlatform}
                        label="Platform"
                      >
                        {displayEvent.sdkPlatform}
                      </DetailRow>
                    )}
                    {displayEvent.sdkVersion && (
                      <DetailRow
                        copyText={displayEvent.sdkVersion}
                        label="Version"
                        mono
                      >
                        {displayEvent.sdkVersion}
                      </DetailRow>
                    )}
                    {displayEvent.userAgent && (
                      <DetailRow
                        copyText={displayEvent.userAgent}
                        label="User Agent"
                      >
                        <span title={displayEvent.userAgent}>
                          {displayEvent.userAgent}
                        </span>
                      </DetailRow>
                    )}
                  </div>
                </section>

                {displayEvent.errorDetail && (
                  <>
                    <Separator />
                    <section>
                      <h3 className="mb-2 font-medium text-[11px] text-ui-fg-muted uppercase tracking-wider">
                        Error
                      </h3>
                      <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3">
                        <code className="font-mono text-destructive-foreground text-xs">
                          {displayEvent.errorDetail}
                        </code>
                      </div>
                    </section>
                  </>
                )}
              </div>
            )}
          </SheetPanel>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
