import z from "zod/v4";

export type GetFeatureFlagsByProjectAndOrganizationInput = z.infer<
  typeof getFeatureFlagsByProjectAndOrganizationInput
>;
export const getFeatureFlagsByProjectAndOrganizationInput = z.object({
  projectSlug: z.string(),
  organizationSlug: z.string(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
