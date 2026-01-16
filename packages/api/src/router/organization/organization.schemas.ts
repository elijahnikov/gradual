import { createInsertSchema, createUpdateSchema } from "@gradual/db";
import { organization } from "@gradual/db/schema";
import z from "zod/v4";

export type GetOrgnizationByIdInput = z.infer<typeof getOrgnizationByIdSchema>;
export const getOrgnizationByIdSchema = z.object({
  organizationId: z.uuid(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export const createOrganizationSchema = createInsertSchema(organization)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    createdById: true,
  })
  .extend({
    setAsDefault: z.boolean().optional(),
  });

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export const updateOrganizationSchema = createUpdateSchema(organization)
  .omit({
    id: true,
    createdAt: true,
    createdById: true,
    deletedAt: true,
    updatedAt: true,
  })
  .extend({
    organizationId: z.uuid(),
  });

export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationSchema>;
export const deleteOrganizationSchema = z.object({
  organizationId: z.uuid(),
});

export type GetOrganizationBySlugInput = z.infer<
  typeof getOrganizationBySlugSchema
>;
export const getOrganizationBySlugSchema = z.object({
  slug: z.string(),
});

export type CheckSlugAvailabilityInput = z.infer<
  typeof checkSlugAvailabilitySchema
>;
export const checkSlugAvailabilitySchema = z.object({
  slug: z.string(),
});
