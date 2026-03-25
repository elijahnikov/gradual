import z from "zod/v4";

const templateVariationSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), z.number(), z.boolean(), z.any()]),
  isDefault: z.boolean(),
});

const templateConfigSchema = z.object({
  type: z.enum(["boolean", "string", "number", "json"]),
  variations: z.array(templateVariationSchema).min(1),
  defaultTargeting: z.unknown().optional(),
});

export type ListFlagTemplatesInput = z.infer<typeof listFlagTemplatesSchema>;
export const listFlagTemplatesSchema = z.object({
  organizationSlug: z.string(),
});

export type GetFlagTemplateInput = z.infer<typeof getFlagTemplateSchema>;
export const getFlagTemplateSchema = z.object({
  templateId: z.uuid(),
  organizationSlug: z.string(),
});

export type CreateFlagTemplateInput = z.infer<typeof createFlagTemplateSchema>;
export const createFlagTemplateSchema = z.object({
  organizationSlug: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  config: templateConfigSchema,
});

export type UpdateFlagTemplateInput = z.infer<typeof updateFlagTemplateSchema>;
export const updateFlagTemplateSchema = z.object({
  templateId: z.uuid(),
  organizationSlug: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  config: templateConfigSchema.optional(),
});

export type DeleteFlagTemplateInput = z.infer<typeof deleteFlagTemplateSchema>;
export const deleteFlagTemplateSchema = z.object({
  templateId: z.uuid(),
  organizationSlug: z.string(),
});

export type IncrementUsageInput = z.infer<typeof incrementUsageSchema>;
export const incrementUsageSchema = z.object({
  templateId: z.uuid(),
});
