import { RiAddLine } from "@remixicon/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { PermissionTooltip } from "@/components/common/permission-tooltip";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useTRPC } from "@/lib/trpc";
import ApiKeysList, { ApiKeysListSkeleton } from "./api-keys-list";
import CreateApiKeyDialog from "./create-api-key-dialog";

export default function ApiKeysPage() {
  const trpc = useTRPC();
  const params = useParams({
    from: "/_organization/$organizationSlug/_project/$projectSlug/api/",
  });
  const { canManageApiKeys } = usePermissions();
  const [createOpen, setCreateOpen] = useState(false);

  const { data: project } = useSuspenseQuery(
    trpc.project.getBySlug.queryOptions({
      slug: params.projectSlug,
      organizationSlug: params.organizationSlug,
    })
  );

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col">
      <div className="absolute top-0 right-1.25 z-50 flex h-9 items-center">
        <PermissionTooltip
          hasPermission={canManageApiKeys}
          message="You don't have permission to create API keys"
        >
          <CreateApiKeyDialog
            onOpenChange={setCreateOpen}
            open={createOpen}
            organizationId={project.organizationId}
            projectId={project.id}
          >
            <RiAddLine className="-mr-0.5 size-4" />
            Create API key
          </CreateApiKeyDialog>
        </PermissionTooltip>
      </div>

      <Suspense fallback={<ApiKeysListSkeleton />}>
        <ApiKeysList
          onCreateClick={() => setCreateOpen(true)}
          organizationId={project.organizationId}
          projectId={project.id}
        />
      </Suspense>
    </div>
  );
}
