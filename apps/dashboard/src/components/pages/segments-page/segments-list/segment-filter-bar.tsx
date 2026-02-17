import { Button } from "@gradual/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { type SortBy, segmentsSearchParams } from "./segments-search-params";

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "createdAt", label: "Created at" },
  { value: "updatedAt", label: "Updated at" },
  { value: "name", label: "Name" },
];

export default function SegmentFilterBar() {
  const [{ sortBy, sortOrder, search }, setQueryStates] =
    useQueryStates(segmentsSearchParams);

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
    <div className="sticky top-9 z-10 flex items-center border-b bg-ui-bg-subtle px-2 py-1.5">
      <div className="flex items-center gap-2">
        <div className="relative">
          <RiSearchLine className="absolute top-1.5 left-2 z-10 size-4 shrink-0 text-ui-fg-muted" />
          <Input
            className="w-64 ps-7"
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search segments"
            size="small"
            value={searchInput}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                className="h-7 w-7 gap-x-0.5"
                size="small"
                variant="outline"
              />
            }
          >
            <RiFilterLine className="size-4 shrink-0 text-ui-fg-muted" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
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
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
