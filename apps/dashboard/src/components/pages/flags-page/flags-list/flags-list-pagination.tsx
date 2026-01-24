import { Button } from "@gradual/ui/button";
import { Text } from "@gradual/ui/text";
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react";
import { useMemo } from "react";

interface FlagsPaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
}

function getVisiblePages(
  currentPage: number,
  totalPages: number
): (number | "ellipsis")[] {
  const delta = 1;
  const pages: (number | "ellipsis")[] = [];

  const left = Math.max(2, currentPage - delta);
  const right = Math.min(totalPages - 1, currentPage + delta);

  pages.push(1);

  if (left > 2) {
    pages.push("ellipsis");
  }

  for (let i = left; i <= right; i++) {
    pages.push(i);
  }

  if (right < totalPages - 1) {
    pages.push("ellipsis");
  }

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export default function FlagsPagination({
  currentPage,
  totalPages,
  hasNextPage,
  onPrevPage,
  onNextPage,
  onGoToPage,
}: FlagsPaginationProps) {
  const visiblePages = useMemo(
    () => getVisiblePages(currentPage, totalPages),
    [currentPage, totalPages]
  );

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-between border-t bg-ui-bg-base px-4 py-2 shadow-xs">
      <Text className="text-ui-fg-muted" size="small">
        Page <span className="font-medium text-ui-fg-base">{currentPage}</span>{" "}
        of <span className="font-medium text-ui-fg-base">{totalPages}</span>
      </Text>
      <div className="flex items-center gap-1">
        <Button
          disabled={currentPage === 1}
          onClick={onPrevPage}
          size="small"
          variant="ghost"
        >
          <RiArrowLeftSLine className="size-4" />
        </Button>

        {visiblePages.map((page, index) =>
          page === "ellipsis" ? (
            <Text
              className="px-2 text-ui-fg-muted"
              key={`ellipsis-${index}`}
              size="small"
            >
              ...
            </Text>
          ) : (
            <Button
              disabled={
                page > currentPage && !hasNextPage && page !== currentPage + 1
              }
              key={page}
              onClick={() => onGoToPage(page)}
              size="small"
              variant={page === currentPage ? "secondary" : "ghost"}
            >
              {page}
            </Button>
          )
        )}

        <Button
          disabled={!hasNextPage}
          onClick={onNextPage}
          size="small"
          variant="ghost"
        >
          <RiArrowRightSLine className="size-4" />
        </Button>
      </div>
    </div>
  );
}
