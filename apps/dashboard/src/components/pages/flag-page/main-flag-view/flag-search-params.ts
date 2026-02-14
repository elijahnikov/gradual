import {
  RiBarChartGroupedFill,
  RiCrosshair2Fill,
  RiListOrdered2,
  RiSettings3Fill,
  RiSwap3Fill,
} from "@remixicon/react";
import { parseAsString, parseAsStringLiteral } from "nuqs";
import type React from "react";

export const tabOptions = [
  "targeting",
  "variations",
  "metrics",
  "events",
  "settings",
] as const;

export type FlagTab = (typeof tabOptions)[number];

export const tabList: {
  tab: FlagTab;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  hotkey?: string;
}[] = [
  {
    tab: "targeting",
    icon: RiCrosshair2Fill,
    description: "Configure targeting rules and rollout strategies",
    hotkey: "1",
  },
  {
    tab: "variations",
    icon: RiSwap3Fill,
    description: "Manage flag variation values",
    hotkey: "2",
  },
  {
    tab: "metrics",
    icon: RiBarChartGroupedFill,
    description: "View flag evaluation metrics",
    hotkey: "3",
  },
  {
    tab: "events",
    icon: RiListOrdered2,
    description: "View flag change history",
    hotkey: "4",
  },
  {
    tab: "settings",
    icon: RiSettings3Fill,
    description: "Flag configuration and danger zone",
    hotkey: "5",
  },
];

export const flagSearchParams = {
  tab: parseAsStringLiteral(tabOptions).withDefault("targeting"),
  environment: parseAsString,
};
