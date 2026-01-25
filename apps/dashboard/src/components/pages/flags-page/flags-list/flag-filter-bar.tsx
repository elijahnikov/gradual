import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@gradual/ui/dropdown-menu";
import { Input } from "@gradual/ui/input";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiFilterLine,
  RiSearchLine,
} from "@remixicon/react";
import { useQueryStates } from "nuqs";
import { useState } from "react";
import { useDebounce } from "react-use";
import { flagsSearchParams, type SortBy } from "./flags-search-params";

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "createdAt", label: "Created at" },
  { value: "updatedAt", label: "Updated at" },
  { value: "evaluationCount", label: "Number of evaluations" },
];

export default function FlagFilterBar() {
  const [{ sortBy, sortOrder, search }, setQueryStates] =
    useQueryStates(flagsSearchParams);

  const [searchInput, setSearchInput] = useState(search);

  useDebounce(
    () => {
      if (searchInput !== search) {
        setQueryStates({ search: searchInput || null });
      }
    },
    300,
    [searchInput]
  );

  const handleSortByClick = (newSortBy: SortBy) => {
    if (newSortBy === sortBy) {
      setQueryStates({ sortOrder: sortOrder === "asc" ? "desc" : "asc" });
    } else {
      setQueryStates({ sortBy: newSortBy, sortOrder: "desc" });
    }
  };

  return (
    <div className="sticky top-10 z-10 flex items-center justify-between border-b bg-ui-bg-base p-2">
      <div className="relative">
        <RiSearchLine className="absolute top-2 left-2 z-10 size-4 shrink-0 text-ui-fg-muted" />
        <Input
          className="w-64 ps-7"
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search flags"
          value={searchInput}
        />
      </div>
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="gap-x-0.5" size="small" variant="outline" />
            }
          >
            <RiFilterLine className="size-4 text-ui-fg-muted" />
            Filter
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {sortOptions.map((option) => {
              const isActive = sortBy === option.value;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleSortByClick(option.value)}
                >
                  {option.label}
                  <div className="ml-auto">
                    {isActive &&
                      (sortOrder === "desc" ? (
                        <RiArrowDownLine className="size-3.5" />
                      ) : (
                        <RiArrowUpLine className="size-3.5" />
                      ))}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
