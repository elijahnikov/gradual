import { createInsertSchema } from "@gradual/db";
import { attribute } from "@gradual/db/schema";
import z from "zod/v4";

export type ListAttributesInput = z.infer<typeof listAttributesSchema>;
export const listAttributesSchema = z.object({
  projectSlug: z.string(),
  organizationSlug: z.string(),
});

export type ListContextsInput = z.infer<typeof listContextsSchema>;
export const listContextsSchema = z.object({
  projectSlug: z.string(),
  organizationSlug: z.string(),
});

export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;
export const createAttributeSchema = createInsertSchema(attribute)
  .omit({
    id: true,
    projectId: true,
    organizationId: true,
    createdById: true,
    createdAt: true,
    updatedAt: true,
    usageCount: true,
    firstSeenAt: true,
    lastSeenAt: true,
    contextId: true,
  })
  .extend({
    projectSlug: z.string(),
    organizationSlug: z.string(),
    key: z
      .string()
      .min(1, "Key is required")
      .regex(
        /^[a-zA-Z][a-zA-Z0-9_]*$/,
        "Key must start with a letter and contain only letters, numbers, and underscores"
      ),
    displayName: z.string().min(1, "Display name is required"),
    type: z
      .enum(["string", "number", "boolean", "date", "json"])
      .default("string"),
    isManual: z.boolean().default(true),
    contextId: z.string().uuid().optional(),
  });
