import z from "zod/v4";

const analyticsBaseSchema = z.object({
  organizationSlug: z.string(),
  projectSlug: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  environmentIds: z.array(z.string()).optional(),
  flagIds: z.array(z.string()).optional(),
});

export type GetOverviewInput = z.infer<typeof getOverviewSchema>;
export const getOverviewSchema = analyticsBaseSchema;

export type GetVolumeOverTimeInput = z.infer<typeof getVolumeOverTimeSchema>;
export const getVolumeOverTimeSchema = analyticsBaseSchema.extend({
  granularity: z.enum(["hour", "6hour", "day"]).optional(),
});

export type GetVariantDistributionInput = z.infer<
  typeof getVariantDistributionSchema
>;
export const getVariantDistributionSchema = analyticsBaseSchema;

export type GetEnvironmentBreakdownInput = z.infer<
  typeof getEnvironmentBreakdownSchema
>;
export const getEnvironmentBreakdownSchema = analyticsBaseSchema;

export type GetTopFlagsInput = z.infer<typeof getTopFlagsSchema>;
export const getTopFlagsSchema = analyticsBaseSchema.extend({
  limit: z.number().min(1).max(50).optional().default(10),
});

export type GetErrorRateInput = z.infer<typeof getErrorRateSchema>;
export const getErrorRateSchema = analyticsBaseSchema.extend({
  granularity: z.enum(["hour", "6hour", "day"]).optional(),
});

export type GetSdkPlatformBreakdownInput = z.infer<
  typeof getSdkPlatformBreakdownSchema
>;
export const getSdkPlatformBreakdownSchema = analyticsBaseSchema;

export type GetLatencyInput = z.infer<typeof getLatencySchema>;
export const getLatencySchema = analyticsBaseSchema.extend({
  granularity: z.enum(["hour", "6hour", "day"]).optional(),
});
