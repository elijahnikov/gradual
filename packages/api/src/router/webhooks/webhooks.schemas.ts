import z from "zod/v4";

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export const createWebhookSchema = z.object({
  organizationSlug: z.string(),
  name: z.string().min(1).max(256),
  url: z.string().url(),
  eventFilters: z
    .object({
      actions: z.array(z.string()).default([]),
      resourceTypes: z.array(z.string()).default([]),
    })
    .default({ actions: [], resourceTypes: [] }),
});

export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export const updateWebhookSchema = z.object({
  organizationSlug: z.string(),
  id: z.string(),
  name: z.string().min(1).max(256).optional(),
  url: z.string().url().optional(),
  enabled: z.boolean().optional(),
  eventFilters: z
    .object({
      actions: z.array(z.string()),
      resourceTypes: z.array(z.string()),
    })
    .optional(),
  regenerateSecret: z.boolean().optional(),
});

export type DeleteWebhookInput = z.infer<typeof deleteWebhookSchema>;
export const deleteWebhookSchema = z.object({
  organizationSlug: z.string(),
  id: z.string(),
});

export type ListWebhooksInput = z.infer<typeof listWebhooksSchema>;
export const listWebhooksSchema = z.object({
  organizationSlug: z.string(),
});

export type GetWebhookInput = z.infer<typeof getWebhookSchema>;
export const getWebhookSchema = z.object({
  organizationSlug: z.string(),
  id: z.string(),
});

export type TestWebhookInput = z.infer<typeof testWebhookSchema>;
export const testWebhookSchema = z.object({
  organizationSlug: z.string(),
  id: z.string(),
});

export type ListWebhookDeliveriesInput = z.infer<
  typeof listWebhookDeliveriesSchema
>;
export const listWebhookDeliveriesSchema = z.object({
  organizationSlug: z.string(),
  webhookId: z.string(),
  limit: z.number().int().positive().max(100).default(50),
  cursor: z.string().optional(),
});

export type DispatchWebhookInput = z.infer<typeof dispatchWebhookSchema>;
export const dispatchWebhookSchema = z.object({
  workerSecret: z.string(),
  organizationId: z.string(),
  auditLogId: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  projectId: z.string().nullable(),
  userId: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  timestamp: z.string(),
});
