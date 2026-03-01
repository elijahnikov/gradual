import type { RouterOutputs } from "@gradual/api";
import { ContextMenu } from "@gradual/ui/context-menu";
import { RiDeleteBinLine } from "@remixicon/react";
import { useState } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import RevokeApiKeyDialog from "../../pages/api-keys-page/revoke-api-key-dialog";

type ApiKey =
  RouterOutputs["apiKey"]["listByOrganizationIdAndProjectId"][number];

interface ApiKeyContextMenuProps {
  children: React.ReactNode;
  apiKey: ApiKey;
  organizationId: string;
  projectId: string;
}

export default function ApiKeyContextMenu({
  children,
  apiKey,
  organizationId,
  projectId,
}: ApiKeyContextMenuProps) {
  const { canManageApiKeys } = usePermissions();
  const [revokeOpen, setRevokeOpen] = useState(false);

  return (
    <>
      <ContextMenu>
        <ContextMenu.Trigger className="border-0!">
          {children}
        </ContextMenu.Trigger>
        <ContextMenu.Content
          onClick={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
        >
          <ContextMenu.Item
            className="text-ui-fg-error [&_svg]:text-ui-fg-error"
            disabled={!canManageApiKeys}
            onClick={() => setRevokeOpen(true)}
          >
            <RiDeleteBinLine className="size-3" />
            Revoke
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu>
      <RevokeApiKeyDialog
        apiKey={apiKey}
        onOpenChange={setRevokeOpen}
        open={revokeOpen}
        organizationId={organizationId}
        projectId={projectId}
      />
    </>
  );
}
