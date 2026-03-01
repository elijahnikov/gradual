import { Tabs, TabsList, TabsTab } from "@gradual/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryStates } from "nuqs";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  type SettingsTab,
  settingsSearchParams,
  settingsTabList,
} from "./settings-search-params";

export default function SettingsSubheader() {
  const [{ tab }, setQueryStates] = useQueryStates(settingsSearchParams);
  const { canManageWebhooks } = usePermissions();

  const handleTabChange = (value: string) => {
    setQueryStates({ tab: value as SettingsTab });
  };

  const tabPermissions: Record<SettingsTab, boolean> = {
    general: true,
    webhooks: canManageWebhooks,
    integrations: true,
    notifications: true,
  };

  useHotkey("1", () => {
    if (tabPermissions.general) {
      setQueryStates({ tab: "general" });
    }
  });
  useHotkey("2", () => {
    if (tabPermissions.webhooks) {
      setQueryStates({ tab: "webhooks" });
    }
  });
  useHotkey("3", () => {
    if (tabPermissions.integrations) {
      setQueryStates({ tab: "integrations" });
    }
  });
  useHotkey("4", () => {
    if (tabPermissions.notifications) {
      setQueryStates({ tab: "notifications" });
    }
  });

  return (
    <div className="sticky top-0 z-50 flex h-10 min-h-10 items-center border-b bg-ui-bg-subtle py-2 pl-1">
      <TooltipProvider>
        <Tabs onValueChange={handleTabChange} value={tab}>
          <TabsList className="h-8 shadow-elevation-card-rest">
            {settingsTabList.map(
              ({ tab: tabValue, icon, description, hotkey }) => {
                const Icon = icon;
                const hasPermission = tabPermissions[tabValue];
                return (
                  <Tooltip key={tabValue}>
                    <TooltipTrigger
                      render={
                        <TabsTab
                          className="h-6! px-2 text-[12px]! sm:max-h-6!"
                          disabled={!hasPermission}
                          value={tabValue}
                        />
                      }
                    >
                      <Icon className="size-3.5" />
                      {tabValue.charAt(0).toUpperCase() + tabValue.slice(1)}
                    </TooltipTrigger>
                    {description && (
                      <TooltipContent className="flex items-center">
                        {hasPermission
                          ? description
                          : "You don't have permission to access this tab"}
                        {hasPermission && hotkey && (
                          <kbd className="relative -top-0.25 ml-1.5 rounded border border-ui-border-base bg-ui-bg-base px-1 py-0.5 font-mono text-[10px] text-ui-fg-base">
                            {hotkey}
                          </kbd>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              }
            )}
          </TabsList>
        </Tabs>
      </TooltipProvider>
    </div>
  );
}
