import { createInsertSchema } from "@gradual/db";
import {
  featureFlag,
  featureFlagEnvironment,
  featureFlagVariation,
} from "@gradual/db/schema";
import z from "zod/v4";

export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagSchema>;
export const createFeatureFlagSchema = createInsertSchema(featureFlag).omit({
  id: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
});

const createVariationSchema = createInsertSchema(featureFlagVariation).omit({
  id: true,
  featureFlagId: true,
  createdAt: true,
  updatedAt: true,
});

const createEnvironmentConfigSchema = createInsertSchema(
  featureFlagEnvironment
).omit({
  id: true,
  featureFlagId: true,
  createdAt: true,
  updatedAt: true,
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
  })
  .extend({
    projectSlug: z.string(),
    organizationSlug: z.string(),
    variations: z
      .array(createVariationSchema)
      .min(1, "At least one variation is required")
      .superRefine((variations, ctx) => {
        const defaultCount = variations.filter((v) => v.isDefault).length;
        if (defaultCount !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Exactly one variation must be marked as default",
          });
        }
      }),
    environmentConfigs: z
      .array(
        createEnvironmentConfigSchema.extend({
          defaultVariationId: z.uuid().optional(),
        })
      )
      .optional()
      .default([]),
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
