import { z } from "zod";

const reasonSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("rule_match"),
    ruleId: z.string(),
    ruleName: z.string().optional(),
  }),
  z.object({
    type: z.literal("percentage_rollout"),
    percentage: z.number(),
    bucket: z.number(),
  }),
  z.object({ type: z.literal("default") }),
  z.object({ type: z.literal("off") }),
  z.object({ type: z.literal("error"), detail: z.string() }),
]);

const evaluationEventSchema = z.object({
  flagKey: z.string(),
  variationKey: z.string().optional(),
  value: z.unknown(),
  reasons: z.array(reasonSchema),
  contextKinds: z.array(z.string()),
  contextKeys: z.record(z.string(), z.array(z.string())),
  timestamp: z.number(),
  evaluatedAt: z.string().optional(),
  matchedTargetName: z.string().optional(),
  ruleId: z.string().optional(),
  flagConfigVersion: z.number().optional(),
  errorDetail: z.string().optional(),
  evaluationDurationUs: z.number().optional(),
  isAnonymous: z.boolean().optional(),
});

const evaluationBatchSchema = z.object({
  meta: z.object({
    projectId: z.string(),
    organizationId: z.string(),
    environmentId: z.string(),
    sdkVersion: z.string(),
    sdkKey: z.string(),
    userAgent: z.string().optional(),
    sdkPlatform: z.string().optional(),
  }),
  events: z.array(evaluationEventSchema),
});

export const ingestEvaluationsSchema = z.object({
  workerSecret: z.string(),
  batches: z.array(evaluationBatchSchema),
});

export type IngestEvaluationsInput = z.infer<typeof ingestEvaluationsSchema>;
