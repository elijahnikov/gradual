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
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
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
});

export const seedEvaluationsSchema = z.object({
  flagId: z.uuid(),
  organizationId: z.string(),
  projectId: z.string(),
  count: z.number().int().min(1).max(5000).default(1000),
});
export type SeedEvaluationsInput = z.infer<typeof seedEvaluationsSchema>;
