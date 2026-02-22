import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Heading } from "@gradual/ui/heading";
import { Text } from "@gradual/ui/text";
import { RiSearchLine } from "@remixicon/react";
import { useQueryStates } from "nuqs";
import { environmentsSearchParams } from "./environments-search-params";

export default function NoResultsState() {
  const [{ search }, setQueryStates] = useQueryStates(environmentsSearchParams);

  const handleClearFilters = () => {
    setQueryStates({
      search: null,
      sortBy: "createdAt",
      sortOrder: "asc",
    });
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <Card className="flex size-12 items-center justify-center">
        <RiSearchLine className="size-6 shrink-0 text-ui-fg-muted" />
      </Card>
      <div className="flex flex-col items-center gap-1 text-center">
        <Heading level="h2">No environments found</Heading>
        <Text className="max-w-sm text-ui-fg-muted">
          {search ? (
            <>
              No environments match "
              <span className="font-medium">{search}</span>". Try a different
              search term or clear the filters.
            </>
          ) : (
            "No environments match your current filters. Try adjusting your filters."
          )}
        </Text>
      </div>
      <Button onClick={handleClearFilters} size="small" variant="outline">
        Clear filters
      </Button>
    </div>
  );
}
