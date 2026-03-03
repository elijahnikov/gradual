import { Tabs, TabsList, TabsTab } from "@gradual/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { RiArrowLeftSLine } from "@remixicon/react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { Link, useParams } from "@tanstack/react-router";
import { useQueryStates } from "nuqs";
import { usePermissions } from "@/lib/hooks/use-permissions";
import {
  type OrgSettingsTab,
  orgSettingsSearchParams,
  orgSettingsTabList,
} from "./org-settings-search-params";

export default function OrgSettingsSubheader() {
  const [{ tab }, setQueryStates] = useQueryStates(orgSettingsSearchParams);
  const { canManageWebhooks, canManageIntegrations, canManageBilling } =
    usePermissions();

  const handleTabChange = (value: string) => {
    setQueryStates({ tab: value as OrgSettingsTab });
  };

  const tabPermissions: Record<OrgSettingsTab, boolean> = {
    general: true,
    projects: true,
    members: true,
    webhooks: canManageWebhooks,
    integrations: canManageIntegrations,
    billing: canManageBilling,
  };

  useHotkey("1", () => {
    if (tabPermissions.general) {
      setQueryStates({ tab: "general" });
    }
  });
  useHotkey("2", () => {
    if (tabPermissions.projects) {
      setQueryStates({ tab: "projects" });
    }
  });
  useHotkey("3", () => {
    if (tabPermissions.members) {
      setQueryStates({ tab: "members" });
    }
  });
  useHotkey("4", () => {
    if (tabPermissions.webhooks) {
      setQueryStates({ tab: "webhooks" });
    }
  });
  useHotkey("5", () => {
    if (tabPermissions.integrations) {
      setQueryStates({ tab: "integrations" });
    }
  });
  useHotkey("6", () => {
    if (tabPermissions.billing) {
      setQueryStates({ tab: "billing" });
    }
  });

  const { organizationSlug } = useParams({ strict: false });

  return (
    <div className="sticky top-0 z-50 flex h-10 min-h-10 items-center gap-1 border-b bg-ui-bg-subtle py-2 pl-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                className="mr-0.5 ml-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-ui-fg-muted transition-colors hover:bg-ui-bg-subtle-hover hover:text-ui-fg-base"
                params={{ organizationSlug: organizationSlug as string }}
                to="/$organizationSlug"
              />
            }
          >
            <RiArrowLeftSLine className="size-4 shrink-0" />
          </TooltipTrigger>
          <TooltipContent>Back to organization</TooltipContent>
        </Tooltip>
        <Tabs onValueChange={handleTabChange} value={tab}>
          <TabsList className="h-8 shadow-elevation-card-rest">
            {orgSettingsTabList.map(
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
