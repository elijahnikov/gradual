import { parseAsInteger, parseAsString, parseAsStringLiteral } from "nuqs";

export const sortByOptions = [
  "createdAt",
  "updatedAt",
  "evaluationCount",
] as const;
export const sortOrderOptions = ["asc", "desc"] as const;

export type SortBy = (typeof sortByOptions)[number];
export type SortOrder = (typeof sortOrderOptions)[number];

export const flagsSearchParams = {
  sortBy: parseAsStringLiteral(sortByOptions).withDefault("createdAt"),
  sortOrder: parseAsStringLiteral(sortOrderOptions).withDefault("desc"),
  page: parseAsInteger.withDefault(1),
  search: parseAsString.withDefault(""),
};
