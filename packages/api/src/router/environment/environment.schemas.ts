import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "@gradual/db";
import { environment } from "@gradual/db/schema";
import z from "zod/v4";

export type CreateEnvironmentInput = z.infer<typeof createEnvironmentSchema>;
export const createEnvironmentSchema = createInsertSchema(environment)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
    projectId: true,
    organizationId: true,
  })
  .extend({
    organizationSlug: z.string(),
    projectSlug: z.string(),
  });

export type ListEnvironmentsInput = z.infer<typeof listEnvironmentsSchema>;
export const listEnvironmentsSchema = createSelectSchema(environment).pick({
  organizationId: true,
  projectId: true,
});

export type GetEnvironmentInput = z.infer<typeof getEnvironmentSchema>;
export const getEnvironmentSchema = createSelectSchema(environment).pick({
  id: true,
  organizationId: true,
});

export type GetEnvironmentBySlugInput = z.infer<
  typeof getEnvironmentBySlugSchema
>;
export const getEnvironmentBySlugSchema = createSelectSchema(environment).pick({
  slug: true,
  organizationId: true,
});

export type UpdateEnvironmentInput = z.infer<typeof updateEnvironmentSchema>;
export const updateEnvironmentSchema = createUpdateSchema(environment)
  .pick({
    name: true,
    slug: true,
    color: true,
  })
  .extend({
    id: z.uuid(),
    organizationId: z.uuid(),
  });

export type DeleteEnvironmentInput = z.infer<typeof deleteEnvironmentSchema>;
export const deleteEnvironmentSchema = createSelectSchema(environment).pick({
  id: true,
  organizationId: true,
});
