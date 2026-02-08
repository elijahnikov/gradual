import { z } from "zod";

const evaluationEventSchema = z.object({
  flagKey: z.string(),
  variationKey: z.string().optional(),
  value: z.unknown(),
  reason: z.string(),
  contextKinds: z.array(z.string()),
  contextKeys: z.record(z.string(), z.array(z.string())),
  timestamp: z.number(),
  matchedTargetName: z.string().optional(),
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
