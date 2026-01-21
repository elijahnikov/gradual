import { createInsertSchema, createUpdateSchema } from "@gradual/db";
import { project } from "@gradual/db/schema";
import z from "zod/v4";

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export const createProjectSchema = createInsertSchema(project).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type GetProjectByIdInput = z.infer<typeof getProjectByIdSchema>;
export const getProjectByIdSchema = z.object({
  projectId: z.uuid(),
  organizationId: z.uuid(),
});

export type GetProjectBySlugInput = z.infer<typeof getProjectBySlugSchema>;
export const getProjectBySlugSchema = z.object({
  slug: z.string(),
  organizationSlug: z.string(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export const updateProjectSchema = createUpdateSchema(project)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  })
  .extend({
    projectId: z.uuid(),
  });

export type DeleteProjectInput = z.infer<typeof deleteProjectSchema>;
export const deleteProjectSchema = z.object({
  projectId: z.uuid(),
});

export type GetAllProjectsByOrganizationIdInput = z.infer<
  typeof getAllProjectsByOrganizationIdSchema
>;
export const getAllProjectsByOrganizationIdSchema = z.object({
  organizationId: z.uuid(),
});

export type GetBreadcrumbsInput = z.infer<typeof getBreadcrumbsSchema>;
export const getBreadcrumbsSchema = z.object({
  organizationSlug: z.string(),
  projectSlug: z.string(),
  flagSlug: z.string().optional(),
});
