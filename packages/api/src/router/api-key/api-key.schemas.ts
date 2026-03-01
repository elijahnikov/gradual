import { createInsertSchema, createSelectSchema } from "@gradual/db";
import { apiKey } from "@gradual/db/schema";
import z from "zod/v4";

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export const createApiKeySchema = createInsertSchema(apiKey)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastUsedAt: true,
    revokedAt: true,
    keyHash: true,
    keyPrefix: true,
    createdById: true,
    key: true,
  })
  .extend({
    organizationId: z.string(),
    projectId: z.string(),
    environmentIds: z.array(z.string()).optional().default([]),
  });

export type GetApiKeyByOrganizationIdAndProjectIdInput = z.infer<
  typeof getApiKeyByOrganizationIdAndProjectIdSchema
>;
export const getApiKeyByOrganizationIdAndProjectIdSchema = createSelectSchema(
  apiKey
).pick({
  organizationId: true,
  projectId: true,
});

export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
export const revokeApiKeySchema = createSelectSchema(apiKey).pick({
  id: true,
  organizationId: true,
  projectId: true,
});

export type ListApiKeysByOrganizationIdAndProjectIdInput = z.infer<
  typeof listApiKeysByOrganizationIdAndProjectIdSchema
>;
export const listApiKeysByOrganizationIdAndProjectIdSchema = createSelectSchema(
  apiKey
)
  .pick({
    organizationId: true,
    projectId: true,
  })
  .extend({
    page: z.number().optional(),
    limit: z.number().optional(),
  });
