import type { RouterOutputs } from "@gradual/api";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTRPC } from "@/lib/trpc";
import DefaultVariation from "./default-variation";
import { IndividualTargetCard } from "./individual-target-card";
import { ReviewChangesModal } from "./review-changes-modal";
import { RuleTargetCard } from "./rule-target-card";
import { SegmentTargetCard } from "./segment-target-card";
import { TargetingList } from "./targeting-list";
import {
  type LocalTarget,
  TargetingStoreProvider,
  useTargetingStore,
} from "./targeting-store";

interface FlagTargetingProps {
  flag: RouterOutputs["featureFlags"]["getByKey"];
  environmentSlug: string;
  organizationSlug: string;
  projectSlug: string;
}

// Hoisted static style object (rendering-hoist-jsx)
const DOTTED_BACKGROUND_STYLE = {
  background: "#ffffff",
  backgroundImage:
    "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0)",
  backgroundSize: "20px 20px",
} as const;

export default function FlagTargeting(props: FlagTargetingProps) {
  return (
    <TargetingStoreProvider>
      <FlagTargetingContent {...props} />
    </TargetingStoreProvider>
  );
}

function FlagTargetingContent({
  flag,
  environmentSlug,
  organizationSlug,
  projectSlug,
}: FlagTargetingProps) {
  const trpc = useTRPC();

  const { data: flagEnvironment } = useSuspenseQuery(
    trpc.featureFlags.getTargetingRules.queryOptions({
      flagId: flag.flag.id,
      environmentSlug,
      organizationSlug,
      projectSlug,
    })
  );

  const { data: attributes = [] } = useQuery(
    trpc.attributes.list.queryOptions({
      projectSlug,
      organizationSlug,
    })
  );

  const { data: segments = [] } = useQuery(
    trpc.segments.list.queryOptions({
      projectSlug,
      organizationSlug,
    })
  );

  const defaultVariationId = flag.variations[0]?.id ?? "";

  // Get store actions and state
  const initialize = useTargetingStore((s) => s.initialize);
  const targets = useTargetingStore((s) => s.targets);
  const addTarget = useTargetingStore((s) => s.addTarget);
  const defaultVariationIdState = useTargetingStore(
    (s) => s.defaultVariationIdState
  );
  const setDefaultVariation = useTargetingStore((s) => s.setDefaultVariation);
  const hasChanges = useTargetingStore((s) => s.hasChanges);
  const openReviewModal = useTargetingStore((s) => s.openReviewModal);

  // Initialize store when data is available
  useEffect(() => {
    initialize({
      attributes,
      segments,
      variations: flag.variations,
      organizationSlug,
      projectSlug,
      defaultVariationId:
        flagEnvironment.defaultVariation?.id ?? defaultVariationId,
    });
  }, [
    initialize,
    attributes,
    segments,
    flag.variations,
    organizationSlug,
    projectSlug,
    flagEnvironment.defaultVariation?.id,
    defaultVariationId,
  ]);

  return (
    <div className="flex w-full flex-1 flex-col p-6">
      <Card className="flex h-full w-full flex-1 flex-col p-0">
        <div className="flex items-center justify-between p-3">
          <Text weight="plus">Targeting rules for {environmentSlug}</Text>
          <Button
            disabled={!hasChanges}
            onClick={openReviewModal}
            size="small"
            variant="gradual"
          >
            Review and save
          </Button>
        </div>
        <div className="flex h-full w-full flex-1 flex-col rounded-md border-t bg-ui-bg-base p-2">
          <div className="flex h-full w-full flex-1 flex-col rounded-md border bg-ui-bg-base p-2">
            <div className="relative flex h-full min-h-[calc(56vh-0.5rem)] w-full flex-col items-center justify-start bg-white">
              <div className="relative z-20 flex h-full flex-col items-center">
                <TargetingList
                  footer={
                    flagEnvironment.defaultVariation && (
                      <DefaultVariation
                        defaultVariationId={defaultVariationIdState}
                        onDefaultVariationChange={setDefaultVariation}
                      />
                    )
                  }
                  onAddTarget={addTarget}
                >
                  {targets.map((target) => (
                    <TargetCard key={target.id} target={target} />
                  ))}
                </TargetingList>
              </div>
              <div
                className="absolute inset-0 z-0 translate-x-2 translate-y-2 opacity-50"
                style={DOTTED_BACKGROUND_STYLE}
              />
            </div>
          </div>
        </div>
      </Card>
      <ReviewChangesModal />
    </div>
  );
}

function TargetCard({ target }: { target: LocalTarget }) {
  switch (target.type) {
    case "rule":
      return <RuleTargetCard targetId={target.id} />;
    case "individual":
      return <IndividualTargetCard targetId={target.id} />;
    case "segment":
      return <SegmentTargetCard targetId={target.id} />;
    default:
      return null;
  }
}
