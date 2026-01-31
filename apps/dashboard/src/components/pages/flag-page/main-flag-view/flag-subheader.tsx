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
import {
  type FlagTab,
  flagSearchParams,
  tabOptions,
} from "./flag-search-params";

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
    <div className="sticky top-0 z-50 flex min-h-10 items-center justify-between border-b bg-ui-bg-base px-3 py-2">
      <Tabs onValueChange={handleTabChange} value={tab}>
        <TabsList className="h-8 shadow-elevation-card-rest">
          {tabOptions.map((tabOption) => (
            <TabsTab
              className="h-7! px-2 text-[13px]!"
              key={tabOption}
              value={tabOption}
            >
              {tabOption.charAt(0).toUpperCase() + tabOption.slice(1)}
            </TabsTab>
          ))}
        </TabsList>
      </Tabs>
      <Select
        items={environmentItems}
        onValueChange={(value) => {
          if (value) {
            handleEnvironmentChange(value);
          }
        }}
        value={currentEnvironment?.value ?? ""}
      >
        <SelectTrigger className="h-7 w-40">
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
