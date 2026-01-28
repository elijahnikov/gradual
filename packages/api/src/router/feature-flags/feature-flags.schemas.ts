import { createInsertSchema } from "@gradual/db";
import { featureFlag, featureFlagVariation } from "@gradual/db/schema";
import z from "zod/v4";

export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagSchema>;
export const createFeatureFlagSchema = createInsertSchema(featureFlag).omit({
  id: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
});

const createVariationSchema = createInsertSchema(featureFlagVariation)
  .omit({
    id: true,
    featureFlagId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    name: z.string().min(1, "Variation name is required"),
    value: z.union([
      z.string().min(1, "Variation value is required"),
      z.number(),
      z.boolean(),
      z.any(),
    ]),
  });

export type CreateCompleteFeatureFlagInput = z.infer<
  typeof createCompleteFeatureFlagSchema
>;
export const createCompleteFeatureFlagSchema = createInsertSchema(featureFlag)
  .omit({
    id: true,
    projectId: true,
    organizationId: true,
    archivedAt: true,
    createdAt: true,
    updatedAt: true,
    maintainerId: true,
  })
  .extend({
    maintainerId: z.string().optional(),
    projectSlug: z.string(),
    organizationSlug: z.string(),
    name: z.string().min(1, "Name is required"),
    key: z
      .string()
      .min(1, "Key is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*(?:-)?$/,
        "Key must contain lowercase letters, numbers, and hyphens only, e.g., 'my-feature-flag'"
      ),
    variations: z
      .array(createVariationSchema)
      .min(1, "At least one variation is required")
      .superRefine((variations, ctx) => {
        variations.forEach((variation, index) => {
          if (!variation.name || variation.name.trim() === "") {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Variation name is required",
              path: [index, "name"],
            });
          }
          if (
            variation.value === undefined ||
            variation.value === null ||
            (typeof variation.value === "string" &&
              variation.value.trim() === "")
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Variation value is required",
              path: [index, "value"],
            });
          }
        });
        const defaultCount = variations.filter((v) => v.isDefault).length;
        if (defaultCount !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Exactly one variation must be marked as default",
          });
        }
      }),
    defaultWhenOnVariationIndex: z.number().int().nonnegative().optional(),
    defaultWhenOffVariationIndex: z.number().int().nonnegative().optional(),
  });

export type GetFeatureFlagsByProjectAndOrganizationInput = z.infer<
  typeof getFeatureFlagsByProjectAndOrganizationSchema
>;
export const getFeatureFlagsByProjectAndOrganizationSchema = z.object({
  projectSlug: z.string(),
  organizationSlug: z.string(),
  limit: z.number().int().positive().max(100).default(20),
  cursor: z
    .object({
      value: z.union([z.number(), z.string()]),
      id: z.string(),
    })
    .optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "evaluationCount"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
});

export type GetFeatureFlagByKeyInput = z.infer<
  typeof getFeatureFlagByKeySchema
>;
export const getFeatureFlagByKeySchema = z.object({
  key: z.string(),
  projectSlug: z.string(),
  organizationSlug: z.string(),
});

export type GetFeatureFlagBreadcrumbInfoInput = z.infer<
  typeof getFeatureFlagBreadcrumbInfoSchema
>;
export const getFeatureFlagBreadcrumbInfoSchema = z.object({
  key: z.string(),
  projectSlug: z.string(),
  organizationSlug: z.string(),
});

export type GetPreviewEvaluationsInput = z.infer<
  typeof getPreviewEvaluationsSchema
>;
export const getPreviewEvaluationsSchema = z.object({
  flagId: z.uuid(),
  organizationId: z.string(),
  projectId: z.string(),
  environmentIds: z.array(z.uuid()).min(1).max(2),
});

export const seedEvaluationsSchema = z.object({
  flagId: z.uuid(),
  organizationId: z.string(),
  projectId: z.string(),
  count: z.number().int().min(1).max(5000).default(1000),
});
export type SeedEvaluationsInput = z.infer<typeof seedEvaluationsSchema>;

export const deleteFlagsSchema = z.object({
  organizationSlug: z.string(),
  projectSlug: z.string(),
  flagIds: z.array(z.uuid()),
});
export type DeleteFlagsInput = z.infer<typeof deleteFlagsSchema>;

export const getTargetingRulesSchema = z.object({
  flagId: z.uuid(),
  environmentSlug: z.string(),
  projectSlug: z.string(),
  organizationSlug: z.string(),
});
export type GetTargetingRulesInput = z.infer<typeof getTargetingRulesSchema>;

const targetingOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "in",
  "not_in",
  "exists",
  "not_exists",
]);

const ruleConditionSchema = z.object({
  attributeKey: z.string(),
  operator: targetingOperatorSchema,
  value: z.unknown(),
});

const targetSchema = z.object({
  id: z.string(),
  type: z.enum(["rule", "individual", "segment"]),
  name: z.string(),
  variationId: z.uuid(),
  conditions: z.array(ruleConditionSchema).optional(),
  attributeKey: z.string().optional(),
  attributeValue: z.string().optional(),
  segmentId: z.uuid().optional(),
});

export const saveTargetingRulesSchema = z.object({
  flagId: z.uuid(),
  environmentSlug: z.string(),
  projectSlug: z.string(),
  organizationSlug: z.string(),
  targets: z.array(targetSchema),
  defaultVariationId: z.uuid(),
});
export type SaveTargetingRulesInput = z.infer<typeof saveTargetingRulesSchema>;
