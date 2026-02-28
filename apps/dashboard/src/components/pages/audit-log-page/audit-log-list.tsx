import type { RouterOutputs } from "@gradual/api";
import { cn } from "@gradual/ui";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Badge } from "@gradual/ui/badge";
import CopyButton from "@gradual/ui/copy-button";
import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { RiHistoryLine } from "@remixicon/react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import dayjs from "dayjs";
import { upperFirst } from "lodash";
import { AnimatePresence, m } from "motion/react";
import { useQueryStates } from "nuqs";
import React, { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { useTRPC } from "@/lib/trpc";
import {
  auditLogSearchParams,
  type ResourceTypeFilter,
  resourceTypeLabels,
} from "./audit-log-search-params";

type AuditLogItem = RouterOutputs["auditLog"]["list"]["items"][number];

const PAGE_SIZE = 50;

const actionBadgeVariant: Record<
  string,
  "success" | "info" | "error" | "warning" | "default"
> = {
  create: "success",
  update: "info",
  delete: "error",
  archive: "warning",
  restore: "success",
  publish: "default",
  unpublish: "warning",
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) {
    return "just now";
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatResourceType(resourceType: string): string {
  return (
    resourceTypeLabels[resourceType as ResourceTypeFilter] ??
    resourceType.replace(/_/g, " ")
  );
}

function getResourceName(item: AuditLogItem): string | null {
  const meta = item.metadata as Record<string, unknown> | null;
  if (!meta) {
    return null;
  }
  return (meta.name as string) ?? (meta.key as string) ?? null;
}

export default function AuditLogList() {
  const trpc = useTRPC();
  const { organizationSlug, projectSlug } = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/audit-log/",
  });

  const [{ action, resourceType, userId, search, startDate, endDate }] =
    useQueryStates(auditLogSearchParams);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      trpc.auditLog.list.infiniteQueryOptions(
        {
          organizationSlug,
          projectSlug,
          limit: PAGE_SIZE,
          action: action ?? undefined,
          resourceType: resourceType ?? undefined,
          userId: userId ?? undefined,
          search: search ?? undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
        {
          getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        }
      )
    );

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: "100px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = useMemo(
    () => data.pages.flatMap((page) => page.items),
    [data.pages]
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (allItems.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-ui-fg-muted">
        <RiHistoryLine className="size-8 text-ui-fg-muted/50" />
        <Text size="small">No audit log entries found</Text>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col">
        {allItems.map((item) => (
          <React.Fragment key={item.id}>
            <AuditLogListItem
              expanded={expandedId === item.id}
              item={item}
              onToggle={() =>
                setExpandedId(expandedId === item.id ? null : item.id)
              }
            />
            <Separator />
          </React.Fragment>
        ))}
      </div>
      {hasNextPage && (
        <div className="flex justify-center py-4" ref={loadMoreRef}>
          {isFetchingNextPage && <Skeleton className="h-8 w-32" />}
        </div>
      )}
    </div>
  );
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
  noStyle = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
  copyText?: string;
  noStyle?: boolean;
}) {
  if (noStyle) {
    return (
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="shrink-0 font-medium text-ui-fg-muted text-xs">
          {label}
        </span>
        <div className="flex min-w-0 items-center gap-1">
          <span>{children}</span>
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

function AuditLogListItem({
  item,
  expanded,
  onToggle,
}: {
  item: AuditLogItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  const resourceName = getResourceName(item);
  const createdAt = new Date(item.createdAt);
  const metadataStr = item.metadata
    ? JSON.stringify(item.metadata, null, 2)
    : null;

  return (
    <div className="flex flex-col">
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: audit log row toggle */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: audit log row toggle */}
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: audit log row toggle */}
      <div
        className={cn(
          "flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-ui-bg-subtle-hover",
          expanded && "border-b bg-ui-bg-subtle"
        )}
        onClick={onToggle}
      >
        <Avatar className="size-6 shrink-0">
          <AvatarImage src={item.user.image ?? undefined} />
          <AvatarFallback className="text-[10px]">
            {item.user.name?.charAt(0) ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex shrink-0 flex-col">
          <Text className="truncate" size="small" weight="plus">
            {item.user.name ?? item.user.email}
          </Text>
          {item.user.name && (
            <Text className="truncate text-ui-fg-muted" size="xsmall">
              {item.user.email}
            </Text>
          )}
        </div>

        <Badge variant={actionBadgeVariant[item.action] ?? "default"}>
          {upperFirst(item.action)}
        </Badge>

        <Text className="text-ui-fg-muted" size="small">
          {formatResourceType(item.resourceType)}
        </Text>

        {resourceName && (
          <Text className="truncate" size="small" weight="plus">
            {resourceName}
          </Text>
        )}

        <div className="ml-auto shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Text className="text-ui-fg-muted" size="xsmall">
                  {timeAgo(createdAt)}
                </Text>
              </TooltipTrigger>
              <TooltipContent>{createdAt.toLocaleString()}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <m.div
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            style={{ overflow: "hidden" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <div className="relative grid grid-cols-3 gap-3 bg-ui-bg-subtle p-3">
              {/* Left — Event details */}
              <div className="relative z-10 flex flex-col gap-3">
                <div className="rounded-md border bg-ui-bg-base p-2.5">
                  <SectionLabel>Event</SectionLabel>
                  <DetailField copyText={item.id} label="ID" mono>
                    {item.id}
                  </DetailField>
                  <DetailField label="Action" noStyle>
                    <Badge
                      variant={actionBadgeVariant[item.action] ?? "default"}
                    >
                      {upperFirst(item.action)}
                    </Badge>
                  </DetailField>
                  <DetailField label="Resource">
                    {formatResourceType(item.resourceType)}
                  </DetailField>
                  {resourceName && (
                    <DetailField label="Name" mono>
                      {resourceName}
                    </DetailField>
                  )}
                  <DetailField
                    copyText={item.resourceId}
                    label="Resource ID"
                    mono
                  >
                    {item.resourceId}
                  </DetailField>
                  {item.projectName && (
                    <DetailField label="Project">
                      {item.projectName}
                    </DetailField>
                  )}
                  <DetailField label="Time" mono>
                    {dayjs(createdAt).format("MMM D, HH:mm:ss")}
                  </DetailField>
                </div>
              </div>

              {/* Center — Actor */}
              <div className="relative z-10 flex flex-col gap-3">
                <div className="rounded-md border bg-ui-bg-base p-2.5">
                  <SectionLabel>Actor</SectionLabel>
                  <DetailField label="Name">
                    {item.user.name ?? "-"}
                  </DetailField>
                  <DetailField copyText={item.user.email} label="Email" mono>
                    {item.user.email}
                  </DetailField>
                  {item.ipAddress && (
                    <DetailField
                      copyText={item.ipAddress}
                      label="IP Address"
                      mono
                    >
                      {item.ipAddress}
                    </DetailField>
                  )}
                  {item.userAgent && (
                    <DetailField label="User Agent">
                      <span title={item.userAgent}>{item.userAgent}</span>
                    </DetailField>
                  )}
                </div>
              </div>

              {/* Right — Metadata */}
              <div className="relative z-10 flex flex-col">
                <div
                  className={`rounded-md border bg-ui-bg-base p-2.5 ${metadataStr ? "flex flex-1 flex-col" : ""}`}
                >
                  <SectionLabel>Metadata</SectionLabel>
                  {metadataStr ? (
                    <div className="relative min-h-0 flex-1">
                      <pre className="absolute inset-0 overflow-auto rounded-md border bg-ui-bg-field p-2 font-mono text-xs leading-relaxed">
                        {metadataStr}
                      </pre>
                      <div className="absolute top-1 right-1 z-10">
                        <CopyButton
                          className="size-5 [&_svg]:size-3"
                          text={metadataStr}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-ui-fg-muted text-xs">
                      No metadata recorded
                    </span>
                  )}
                </div>
              </div>

              {/* Dot pattern overlay */}
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
        )}
      </AnimatePresence>
    </div>
  );
}

export function AuditLogListSkeleton() {
  return (
    <div className="my-2 flex flex-col gap-y-2 px-2">
      {Array.from({ length: 12 }).map((_, index) => (
        <Skeleton className="h-12 w-full" key={index} />
      ))}
    </div>
  );
}
