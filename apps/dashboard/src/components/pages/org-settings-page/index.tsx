import { useQueryStates } from "nuqs";
import { useMemo } from "react";
import { orgSettingsSearchParams } from "./org-settings-search-params";
import OrgSettingsSubheader from "./org-settings-subheader";
import BillingSettings from "./tab-content/billing";
import OrgGeneralSettings from "./tab-content/general";
import IntegrationsSettings from "./tab-content/integrations";
import MembersSettings from "./tab-content/members";
import ProjectsSettings from "./tab-content/projects";
import WebhooksSettings from "./tab-content/webhooks";

export default function OrgSettingsPage() {
  const [{ tab }] = useQueryStates(orgSettingsSearchParams);

  const tabContent = useMemo(() => {
    switch (tab) {
      case "general":
        return <OrgGeneralSettings />;
      case "projects":
        return <ProjectsSettings />;
      case "members":
        return <MembersSettings />;
      case "webhooks":
        return <WebhooksSettings />;
      case "integrations":
        return <IntegrationsSettings />;
      case "billing":
        return <BillingSettings />;
      default:
        return null;
    }
  }, [tab]);

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col sm:h-[calc(100vh-3.75rem)] sm:min-h-[calc(100vh-3.75rem)]">
      <OrgSettingsSubheader />
      <div className="flex min-h-0 w-full flex-1 flex-col">{tabContent}</div>
    </div>
  );
}
