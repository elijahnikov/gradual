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
}[] = [
  { tab: "targeting", icon: RiCrosshair2Fill },
  { tab: "variations", icon: RiSwap3Fill },
  { tab: "metrics", icon: RiBarChartGroupedFill },
  { tab: "events", icon: RiListOrdered2 },
  { tab: "settings", icon: RiSettings3Fill },
];

export const flagSearchParams = {
  tab: parseAsStringLiteral(tabOptions).withDefault("targeting"),
  environment: parseAsString,
};
