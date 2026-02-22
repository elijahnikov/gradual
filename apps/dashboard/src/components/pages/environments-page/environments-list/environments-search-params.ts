import { parseAsString, parseAsStringLiteral } from "nuqs";

const sortByOptions = ["createdAt", "name"] as const;
const sortOrderOptions = ["asc", "desc"] as const;

export type SortBy = (typeof sortByOptions)[number];

export const environmentsSearchParams = {
  sortBy: parseAsStringLiteral(sortByOptions).withDefault("createdAt"),
  sortOrder: parseAsStringLiteral(sortOrderOptions).withDefault("asc"),
  search: parseAsString.withDefault(""),
};
