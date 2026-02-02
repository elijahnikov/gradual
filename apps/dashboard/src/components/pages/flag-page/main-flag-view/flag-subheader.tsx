import type { RouterOutputs } from "@gradual/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gradual/ui/select";
import { Tabs, TabsList, TabsTab } from "@gradual/ui/tabs";
import { useQueryStates } from "nuqs";
import { useEffect, useMemo } from "react";
import { type FlagTab, flagSearchParams, tabList } from "./flag-search-params";

interface FlagSubheaderProps {
  environments: RouterOutputs["featureFlags"]["getByKey"]["environments"];
}

export default function FlagSubheader({ environments }: FlagSubheaderProps) {
  const [{ tab, environment }, setQueryStates] =
    useQueryStates(flagSearchParams);

  const environmentItems = useMemo(
    () =>
      environments.map((env) => ({
        label: env.environment.name,
        value: env.environment.slug,
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

  return (
    <div className="sticky top-0 z-50 flex h-9 min-h-9 items-center justify-between border-b bg-ui-bg-base py-2 pr-2 pl-1">
      <div className="flex items-center gap-x-2">
        <Tabs onValueChange={handleTabChange} value={tab}>
          <TabsList className="h-8 shadow-elevation-card-rest">
            {tabList.map(({ tab, icon }) => {
              const Icon = icon;
              return (
                <TabsTab
                  className="h-6! px-2 text-[12px]! sm:max-h-6!"
                  key={tab}
                  value={tab}
                >
                  <Icon className="size-3.5" />
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </TabsTab>
              );
            })}
          </TabsList>
        </Tabs>
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
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {environmentItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
