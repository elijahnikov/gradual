import { Text } from "@gradual/ui/text";
import { RiInformationLine } from "@remixicon/react";
import { Suspense } from "react";
import AuditLogFilterBar from "./audit-log-filter-bar";
import AuditLogList, { AuditLogListSkeleton } from "./audit-log-list";

export default function AuditLogPageComponent() {
  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col sm:h-[calc(100vh-3.75rem)] sm:min-h-[calc(100vh-3.75rem)]">
      <AuditLogFilterBar />
      <div className="flex items-center gap-1.5 border-b bg-ui-bg-subtle/50 px-4 py-1">
        <RiInformationLine className="size-3.5 shrink-0 text-ui-fg-muted" />
        <Text className="text-ui-fg-muted" size="xsmall">
          Audit logs are retained for 90 days. Entries are immutable and cannot
          be modified or deleted.
        </Text>
      </div>
      <Suspense fallback={<AuditLogListSkeleton />}>
        <AuditLogList />
      </Suspense>
    </div>
  );
}
