import { useQueryStates } from "nuqs";
import { useMemo } from "react";
import { settingsSearchParams } from "./settings-search-params";
import SettingsSubheader from "./settings-subheader";
import GeneralSettings from "./tab-content/general";
import IntegrationsSettings from "./tab-content/integrations";
import NotificationsSettings from "./tab-content/notifications";
import WebhooksSettings from "./tab-content/webhooks";

export default function SettingsPage() {
  const [{ tab }] = useQueryStates(settingsSearchParams);

  const tabContent = useMemo(() => {
    switch (tab) {
      case "general":
        return <GeneralSettings />;
      case "webhooks":
        return <WebhooksSettings />;
      case "integrations":
        return <IntegrationsSettings />;
      case "notifications":
        return <NotificationsSettings />;
      default:
        return null;
    }
  }, [tab]);

  return (
    <div className="flex h-[calc(100vh-3.75rem)] min-h-[calc(100vh-3.75rem)] w-full flex-col sm:h-[calc(100vh-3.75rem)] sm:min-h-[calc(100vh-3.75rem)]">
      <SettingsSubheader />
      <div className="flex min-h-0 w-full flex-1 flex-col">{tabContent}</div>
    </div>
  );
}
