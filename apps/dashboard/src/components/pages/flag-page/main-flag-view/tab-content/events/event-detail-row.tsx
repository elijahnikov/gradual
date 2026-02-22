import type { RouterOutputs } from "@gradual/api";
import { Badge } from "@gradual/ui/badge";
import CopyButton from "@gradual/ui/copy-button";
import { TableCell, TableRow } from "@gradual/ui/table";
import { Text } from "@gradual/ui/text";
import dayjs from "dayjs";
import upperFirst from "lodash/upperFirst";
import { m } from "motion/react";
import {
  formatStructuredReason,
  isStructuredReason,
  type StructuredReason,
  structuredReasonVariants,
} from "./reason-utils";

type EventItem = RouterOutputs["featureFlags"]["getEvents"]["items"][number];

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="pb-1.5 font-medium font-mono text-[11px] text-ui-fg-muted uppercase tracking-wider">
      {children}
    </h4>
  );
}

function DetailField({
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
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="shrink-0 font-medium text-ui-fg-muted text-xs">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1">
        <span
          className={`truncate rounded-sm border px-1 py-0 text-ui-fg-base text-xs ${mono ? "font-mono" : ""}`}
        >
          {children}
        </span>
        {copyText && (
          <CopyButton
            className="size-3.5 shrink-0 [&_svg]:size-2.5"
            text={copyText}
          />
        )}
      </div>
    </div>
  );
}

function ReasonCard({ reason }: { reason: StructuredReason }) {
  const variant = structuredReasonVariants[reason.type] ?? "outline";
  return (
    <div className="flex flex-col gap-1 rounded-md border bg-ui-bg-base p-2">
      <div className="flex items-center justify-between gap-2">
        <Badge className="shrink-0" size="sm" variant={variant}>
          {upperFirst(reason.type.replace("_", " "))}
        </Badge>
        {reason.type === "rule_match" && reason.ruleId && (
          <span className="truncate font-mono text-[11px] text-ui-fg-muted">
            {reason.ruleId}
          </span>
        )}
      </div>
      <Text className="text-xs leading-snug">
        {upperFirst(formatStructuredReason(reason))}
      </Text>
      {reason.type === "percentage_rollout" && reason.bucket != null && (
        <span className="text-[11px] text-ui-fg-muted">
          Bucket: {reason.bucket.toLocaleString()} / 100,000
        </span>
      )}
      {reason.type === "error" && reason.detail && (
        <span className="text-[11px] text-ui-fg-on-error">{reason.detail}</span>
      )}
    </div>
  );
}

export default function EventDetailRow({ event }: { event: EventItem }) {
  const reasons = Array.isArray(event.reasons)
    ? event.reasons.filter(isStructuredReason)
    : [];
  const valueStr = formatValue(event.value);
  const isJson = isJsonValue(event.value);
  const inputsUsed = event.inputsUsed ?? [];

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="p-0" colSpan={6}>
        <m.div
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          style={{ overflow: "hidden" }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <div className="group/detail relative grid grid-cols-3 gap-3 bg-ui-bg-subtle p-3">
            <div className="relative z-10 flex flex-col gap-3">
              <div className="rounded-md border bg-ui-bg-base p-2.5">
                <SectionLabel>Decision</SectionLabel>
                <DetailField
                  copyText={event.traceId ?? event.id}
                  label="ID"
                  mono
                >
                  {event.traceId ?? event.id}
                </DetailField>
                <DetailField label="Variation">
                  <span className="flex items-center gap-1">
                    {event.variationColor && (
                      <span
                        className="inline-block size-2 shrink-0 rounded-[3px]"
                        style={{ backgroundColor: event.variationColor }}
                      />
                    )}
                    {event.variationName ?? "-"}
                  </span>
                </DetailField>
                {event.evaluationDurationUs != null && (
                  <DetailField label="Latency" mono>
                    {(event.evaluationDurationUs / 1000).toFixed(2)}ms
                  </DetailField>
                )}
                {event.sdkVersion && (
                  <DetailField label="SDK" mono>
                    {event.sdkPlatform
                      ? `${event.sdkPlatform} ${event.sdkVersion}`
                      : event.sdkVersion}
                  </DetailField>
                )}
                {event.flagConfigVersion != null && (
                  <DetailField label="Config" mono>
                    v{event.flagConfigVersion}
                  </DetailField>
                )}
                <DetailField label="Time" mono>
                  {dayjs(event.createdAt).format("MMM D, HH:mm:ss")}
                </DetailField>
              </div>

              <div className="rounded-md border bg-ui-bg-base p-2.5">
                <SectionLabel>Metadata</SectionLabel>
                <DetailField copyText={event.id} label="Eval ID" mono>
                  {event.id}
                </DetailField>
                {event.variationId && (
                  <DetailField
                    copyText={event.variationId}
                    label="Variation ID"
                    mono
                  >
                    {event.variationId}
                  </DetailField>
                )}
                {event.userAgent && (
                  <DetailField copyText={event.userAgent} label="User Agent">
                    <span title={event.userAgent}>{event.userAgent}</span>
                  </DetailField>
                )}
              </div>
            </div>

            {/* Center — Reason + Inputs */}
            <div className="relative z-10 flex flex-col gap-3">
              <div className="rounded-md border bg-ui-bg-base p-2.5">
                <SectionLabel>Reason</SectionLabel>
                <div className="flex flex-col gap-1.5">
                  {reasons.map((r, i) => (
                    <ReasonCard key={i} reason={r} />
                  ))}
                  {reasons.length === 0 && (
                    <span className="text-ui-fg-muted text-xs">
                      No reason recorded
                    </span>
                  )}
                </div>
                {inputsUsed.length > 0 && (
                  <div className="mt-2.5 border-t pt-2">
                    <span className="mb-1 block text-[11px] text-ui-fg-muted">
                      Inputs referenced
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {inputsUsed.map((input) => (
                        <Badge
                          className="font-mono text-[11px]"
                          key={input}
                          size="sm"
                          variant="outline"
                        >
                          {input}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {event.errorDetail && (
                <div className="rounded-md border border-ui-tag-red-border bg-ui-tag-red-bg p-2.5">
                  <SectionLabel>Error</SectionLabel>
                  <code className="font-mono text-ui-tag-red-text text-xs">
                    {event.errorDetail}
                  </code>
                </div>
              )}
            </div>

            {/* Right — Returned Value */}
            <div className="relative z-10 flex flex-col">
              <div
                className={`rounded-md border bg-ui-bg-base p-2.5 ${isJson ? "flex flex-1 flex-col" : ""}`}
              >
                <SectionLabel>Returned Value</SectionLabel>
                {isJson ? (
                  <div className="relative min-h-0 flex-1">
                    <pre className="absolute inset-0 overflow-auto rounded-md border bg-ui-bg-field p-2 font-mono text-xs leading-relaxed">
                      {valueStr}
                    </pre>
                    <div className="absolute top-1 right-1 z-10">
                      <CopyButton
                        className="size-5 [&_svg]:size-3"
                        text={valueStr}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <code className="rounded-md border bg-ui-bg-field px-2 py-1 font-mono text-xs">
                      {valueStr}
                    </code>
                    <CopyButton
                      className="size-4 shrink-0 [&_svg]:size-2.5"
                      text={valueStr}
                    />
                  </div>
                )}
              </div>
            </div>
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-50 dark:hidden"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 z-0 hidden opacity-50 dark:block"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.15) 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            />
          </div>
        </m.div>
      </TableCell>
    </TableRow>
  );
}
