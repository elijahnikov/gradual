import type { RouterOutputs } from "@gradual/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Tabs, TabsList, TabsTab } from "@gradual/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@gradual/ui/tooltip";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryStates } from "nuqs";
import { useEffect, useMemo } from "react";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { type FlagTab, flagSearchParams, tabList } from "./flag-search-params";

interface FlagSubheaderProps {
  environments: RouterOutputs["featureFlags"]["getByKey"]["environments"];
}

export default function FlagSubheader({ environments }: FlagSubheaderProps) {
  const { canUpdateFlags, canDeleteFlags } = usePermissions();
  const [{ tab, environment }, setQueryStates] =
    useQueryStates(flagSearchParams);

  const environmentItems = useMemo(
    () =>
      environments.map((env) => ({
        label: env.environment.name,
        value: env.environment.slug,
        color: env.environment.color,
      })),
    [environments]
  );

  useEffect(() => {
    if (!environment && environments.length > 0) {
      setQueryStates({
        environment: environments[0]?.environment.slug ?? null,
      });
    }
  }, [environment, environments, setQueryStates]);

  const handleTabChange = (value: string) => {
    setQueryStates({ tab: value as FlagTab });
  };

  const handleEnvironmentChange = (value: string) => {
    setQueryStates({ environment: value });
  };

  const currentEnvironment = environmentItems.find(
    (item) => item.value === environment
  );

  useHotkey("1", () => {
    setQueryStates({ tab: "targeting" });
  });
  useHotkey("2", () => {
    setQueryStates({ tab: "variations" });
  });
  useHotkey("3", () => {
    setQueryStates({ tab: "metrics" });
  });
  useHotkey("4", () => {
    setQueryStates({ tab: "events" });
  });
  useHotkey("5", () => {
    setQueryStates({ tab: "settings" });
  });

  return (
    <div className="sticky top-0 z-50 flex h-10 min-h-10 items-center justify-between border-b bg-ui-bg-subtle py-2 pr-2 pl-1">
      <div className="flex items-center gap-x-2">
        <TooltipProvider>
          <Tabs onValueChange={handleTabChange} value={tab}>
            <TabsList className="h-8 shadow-elevation-card-rest">
              {tabList.map(({ tab: tabValue, icon, description, hotkey }) => {
                const Icon = icon;
                const isSettingsDisabled =
                  tabValue === "settings" && !canUpdateFlags && !canDeleteFlags;
                const tooltipText = isSettingsDisabled
                  ? "You don't have permission to access settings"
                  : description;
                return (
                  <Tooltip key={tabValue}>
                    <TooltipTrigger
                      render={
                        <TabsTab
                          className="h-6! px-2 text-[12px]! sm:max-h-6!"
                          disabled={isSettingsDisabled}
                          value={tabValue}
                        />
                      }
                    >
                      <Icon className="size-3.5" />
                      {tabValue.charAt(0).toUpperCase() + tabValue.slice(1)}
                    </TooltipTrigger>
                    {tooltipText && (
                      <TooltipContent className="flex items-center">
                        {tooltipText}
                        {hotkey && (
                          <kbd className="relative -top-0.25 ml-1.5 rounded border border-ui-border-base bg-ui-bg-base px-1 py-0.5 font-mono text-[10px] text-ui-fg-base">
                            {hotkey}
                          </kbd>
                        )}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </TabsList>
          </Tabs>
        </TooltipProvider>
      </div>
      <Select
        items={environmentItems}
        onValueChange={(value) => {
          if (value) {
            handleEnvironmentChange(value);
          }
        }}
        value={currentEnvironment?.value ?? ""}
      >
        <SelectTrigger className="h-6! min-h-6! w-40 text-xs! sm:max-h-6!">
          <SelectValue>
            <div className="flex items-center gap-x-0.5">
              <div
                className="mr-1.5 size-3.5! shrink-0! rounded-full"
                style={{
                  backgroundColor: currentEnvironment?.color ?? undefined,
                }}
              />
              {currentEnvironment?.label}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {environmentItems.map((item) => (
            <SelectItem
              className="flex items-center gap-x-1.5"
              key={item.value}
              value={item.value}
            >
              <div className="flex items-center gap-x-0.5">
                <div
                  className="mr-1.5 size-4! shrink-0! rounded-full"
                  style={{ backgroundColor: item.color ?? undefined }}
                />
                {item.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
