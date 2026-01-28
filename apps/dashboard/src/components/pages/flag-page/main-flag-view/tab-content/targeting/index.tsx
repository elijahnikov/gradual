import type { RouterOutputs } from "@gradual/api";
import { Button } from "@gradual/ui/button";
import { Card } from "@gradual/ui/card";
import { Text } from "@gradual/ui/text";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTRPC } from "@/lib/trpc";
import DefaultVariation from "./default-variation";
import { IndividualTargetCard } from "./individual-target-card";
import { RuleTargetCard } from "./rule-target-card";
import { SegmentTargetCard } from "./segment-target-card";
import { TargetingList } from "./targeting-list";
import type { RuleCondition, TargetType } from "./types";

interface FlagTargetingProps {
  flag: RouterOutputs["featureFlags"]["getByKey"];
  environmentSlug: string;
  organizationSlug: string;
  projectSlug: string;
}

interface LocalTarget {
  id: string;
  type: TargetType;
  name: string;
  variationId: string;
  conditions?: RuleCondition[];
  attributeKey?: string;
  attributeValue?: string;
  segmentId?: string;
}

export default function FlagTargeting({
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
  const [targets, setTargets] = useState<LocalTarget[]>([]);
  const [defaultVariationIdState, setDefaultVariationIdState] = useState(
    flagEnvironment.defaultVariation?.id ?? defaultVariationId
  );

  const handleAddTarget = useCallback(
    (type: TargetType, index: number) => {
      const newTarget: LocalTarget = {
        id: crypto.randomUUID(),
        type,
        name: `${type}`,
        variationId: defaultVariationId,
      };
      setTargets((prev) => {
        const updated = [...prev];
        updated.splice(index, 0, newTarget);
        return updated;
      });
    },
    [defaultVariationId]
  );

  const handleDeleteTarget = useCallback((id: string) => {
    setTargets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleVariationChange = useCallback(
    (id: string, variationId: string) => {
      setTargets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, variationId } : t))
      );
    },
    []
  );

  const handleConditionsChange = useCallback(
    (id: string, conditions: RuleCondition[]) => {
      setTargets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, conditions } : t))
      );
    },
    []
  );

  const handleIndividualChange = useCallback(
    (id: string, attributeKey: string, attributeValue: string) => {
      setTargets((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, attributeKey, attributeValue } : t
        )
      );
    },
    []
  );

  const handleSegmentChange = useCallback((id: string, segmentId: string) => {
    setTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, segmentId } : t))
    );
  }, []);

  const handleNameChange = useCallback((id: string, name: string) => {
    setTargets((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
  }, []);

  const handleDefaultVariationChange = useCallback((variationId: string) => {
    setDefaultVariationIdState(variationId);
  }, []);

  const renderTarget = (target: LocalTarget) => {
    switch (target.type) {
      case "rule":
        return (
          <RuleTargetCard
            attributes={attributes}
            initialConditions={target.conditions}
            key={target.id}
            name={target.name}
            onConditionsChange={(conditions) =>
              handleConditionsChange(target.id, conditions)
            }
            onDelete={() => handleDeleteTarget(target.id)}
            onNameChange={(name) => handleNameChange(target.id, name)}
            onVariationChange={(variationId) =>
              handleVariationChange(target.id, variationId)
            }
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            selectedVariationId={target.variationId}
            variations={flag.variations}
          />
        );
      case "individual":
        return (
          <IndividualTargetCard
            attributes={attributes}
            initialAttributeKey={target.attributeKey}
            initialAttributeValue={target.attributeValue}
            key={target.id}
            name={target.name}
            onDelete={() => handleDeleteTarget(target.id)}
            onIndividualChange={(attributeKey, attributeValue) =>
              handleIndividualChange(target.id, attributeKey, attributeValue)
            }
            onNameChange={(name) => handleNameChange(target.id, name)}
            onVariationChange={(variationId) =>
              handleVariationChange(target.id, variationId)
            }
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            selectedVariationId={target.variationId}
            variations={flag.variations}
          />
        );
      case "segment":
        return (
          <SegmentTargetCard
            initialSegmentId={target.segmentId}
            key={target.id}
            name={target.name}
            onDelete={() => handleDeleteTarget(target.id)}
            onNameChange={(name) => handleNameChange(target.id, name)}
            onSegmentChange={(segmentId) =>
              handleSegmentChange(target.id, segmentId)
            }
            onVariationChange={(variationId) =>
              handleVariationChange(target.id, variationId)
            }
            organizationSlug={organizationSlug}
            projectSlug={projectSlug}
            segments={segments}
            selectedVariationId={target.variationId}
            variations={flag.variations}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex w-full flex-1 flex-col p-6">
      <Card className="flex h-full w-full flex-1 flex-col p-0">
        <div className="flex items-center justify-between p-3">
          <Text weight="plus">Targeting rules for {environmentSlug}</Text>
          <Button disabled size="small" variant="gradual">
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
                        defaultVariation={{
                          ...flagEnvironment.defaultVariation,
                          id: defaultVariationIdState,
                        }}
                        onDefaultVariationChange={handleDefaultVariationChange}
                        variations={flag.variations}
                      />
                    )
                  }
                  onAddTarget={handleAddTarget}
                >
                  {targets.map(renderTarget)}
                </TargetingList>
              </div>
              <div
                className="absolute inset-0 z-0 translate-x-2 translate-y-2 opacity-50"
                style={{
                  background: "#ffffff",
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.35) 1px, transparent 0)",
                  backgroundSize: "20px 20px",
                }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
