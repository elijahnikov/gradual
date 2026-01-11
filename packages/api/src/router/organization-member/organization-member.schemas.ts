import { createInsertSchema, createSelectSchema } from "@gradual/db";
import { organizationMember } from "@gradual/db/schema";
import z from "zod/v4";

export type CreateOrganizationMemberInput = z.infer<
  typeof createOrganizationMemberSchema
>;
export const createOrganizationMemberSchema = createInsertSchema(
  organizationMember
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GetOrganizationMembersInput = z.infer<
  typeof getOrganizationMembersSchema
>;
export const getOrganizationMembersSchema = createSelectSchema(
  organizationMember
)
  .pick({ organizationId: true })
  .extend({
    orderDirection: z.enum(["asc", "desc"]).optional().default("asc"),
    orderBy: z
      .enum(["createdAt", "updatedAt", "role"])
      .optional()
      .default("createdAt"),
    limit: z.number().optional().default(10),
    offset: z.number().optional().default(0),
  });

export type RemoveOrganizationMemberInput = z.infer<
  typeof removeOrganizationMemberSchema
>;
export const removeOrganizationMemberSchema = createSelectSchema(
  organizationMember
).pick({ id: true, organizationId: true });

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export const updateMemberRoleSchema = createSelectSchema(
  organizationMember
).pick({ id: true, organizationId: true, role: true });
