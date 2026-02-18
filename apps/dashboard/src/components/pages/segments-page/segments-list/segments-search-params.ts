import { parseAsString, parseAsStringLiteral } from "nuqs";

export const sortByOptions = ["createdAt", "updatedAt", "name"] as const;
export const sortOrderOptions = ["asc", "desc"] as const;

export type SortBy = (typeof sortByOptions)[number];
export type SortOrder = (typeof sortOrderOptions)[number];

export const segmentsSearchParams = {
  sortBy: parseAsStringLiteral(sortByOptions).withDefault("createdAt"),
  sortOrder: parseAsStringLiteral(sortOrderOptions).withDefault("desc"),
  search: parseAsString.withDefault(""),
};
