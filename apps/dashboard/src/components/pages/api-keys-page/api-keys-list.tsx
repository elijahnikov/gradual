import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Separator } from "@gradual/ui/separator";
import { Skeleton } from "@gradual/ui/skeleton";
import { Text } from "@gradual/ui/text";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { RiCalendarLine, RiKey2Fill, RiTimeLine } from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import ApiKeyContextMenu from "@/components/common/context-menus/api-key-context-menu";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";

type ApiKey =
  RouterOutputs["apiKey"]["listByOrganizationIdAndProjectId"][number];

function ApiKeyRow({
  apiKey,
  organizationId,
  projectId,
}: {
  apiKey: ApiKey;
  organizationId: string;
  projectId: string;
}) {
  const initials = apiKey.createdBy?.name
    ? apiKey.createdBy.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <ApiKeyContextMenu
      apiKey={apiKey}
      organizationId={organizationId}
      projectId={projectId}
    >
      <div className="flex h-16 items-center border-0 px-4 hover:bg-ui-bg-subtle-hover">
        <div className="flex flex-col gap-y-0.5">
          <Text className="text-[14px]" weight="plus">
            {apiKey.name}
          </Text>
          <TooltipProvider>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <RiKey2Fill className="size-4 text-ui-fg-muted" />
                <Text className="font-mono text-ui-fg-muted" size="xsmall">
                  {apiKey.keyPrefix}...
                </Text>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <RiCalendarLine className="size-4 text-ui-fg-muted" />
                    <Text className="font-mono text-ui-fg-muted" size="xsmall">
                      {dayjs(apiKey.createdAt).format("MMM D")}
                    </Text>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  Created on {dayjs(apiKey.createdAt).format("MMMM D, YYYY")}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center gap-1">
                    <RiTimeLine className="size-4 text-ui-fg-muted" />
                    <Text className="font-mono text-ui-fg-muted" size="xsmall">
                      {apiKey.lastUsedAt
                        ? dayjs(apiKey.lastUsedAt).format("MMM D")
                        : "Never"}
                    </Text>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {apiKey.lastUsedAt
                    ? `Last used ${dayjs(apiKey.lastUsedAt).format("MMMM D, YYYY")}`
                    : "Never used"}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
        <div className="ml-auto">
          <Avatar className="size-6 shadow-buttons-neutral">
            <AvatarImage src={apiKey.createdBy?.image ?? undefined} />
            <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </ApiKeyContextMenu>
  );
}

interface ApiKeysListProps {
  organizationId: string;
  projectId: string;
  onCreateClick: () => void;
}

export default function ApiKeysList({
  organizationId,
  projectId,
  onCreateClick,
}: ApiKeysListProps) {
  const trpc = useTRPC();
  const { canManageApiKeys } = usePermissions();

  const { data: apiKeys } = useSuspenseQuery(
    trpc.apiKey.listByOrganizationIdAndProjectId.queryOptions({
      organizationId,
      projectId,
    })
  );

  if (apiKeys.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <Card className="flex size-12 items-center justify-center">
          <RiKey2Fill className="size-8 shrink-0 text-ui-fg-muted" />
        </Card>
        <div className="flex flex-col items-center gap-1 text-center">
          <Heading level="h2">No API keys created yet.</Heading>
          <Text className="max-w-sm text-ui-fg-muted">
            Create an API key to authenticate SDK requests to this project.
          </Text>
        </div>
        <PermissionTooltip
          hasPermission={canManageApiKeys}
          message="You don't have permission to create API keys"
        >
          <Button onClick={onCreateClick} size="small" variant="outline">
            Create API key
          </Button>
        </PermissionTooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col">
        {apiKeys.map((key) => (
          <div key={key.id}>
            <ApiKeyRow
              apiKey={key}
              organizationId={organizationId}
              projectId={projectId}
            />
            <Separator />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ApiKeysListSkeleton() {
  return (
    <div className="my-2 flex flex-col gap-y-2 px-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton className="h-12 w-full" key={i} />
      ))}
    </div>
  );
}
