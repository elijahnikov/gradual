import { parseAsString, parseAsStringLiteral } from "nuqs";

export const tabOptions = [
  "targeting",
  "variations",
  "metrics",
  "events",
  "settings",
] as const;

export type FlagTab = (typeof tabOptions)[number];

export const flagSearchParams = {
  tab: parseAsStringLiteral(tabOptions).withDefault("targeting"),
  environment: parseAsString,
};
