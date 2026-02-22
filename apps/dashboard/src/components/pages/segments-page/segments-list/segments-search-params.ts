import { parseAsString, parseAsStringLiteral } from "nuqs";

const sortByOptions = ["createdAt", "updatedAt", "name"] as const;
const sortOrderOptions = ["asc", "desc"] as const;

export type SortBy = (typeof sortByOptions)[number];

export const segmentsSearchParams = {
  sortBy: parseAsStringLiteral(sortByOptions).withDefault("createdAt"),
  sortOrder: parseAsStringLiteral(sortOrderOptions).withDefault("desc"),
  search: parseAsString.withDefault(""),
};
