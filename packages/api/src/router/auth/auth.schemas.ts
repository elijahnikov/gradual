import { createUpdateSchema } from "@gradual/db";
import { user } from "@gradual/db/schema";
import z from "zod/v4";

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export const updateUserSchema = createUpdateSchema(user)
  .omit({
    id: true,
    createdAt: true,
    emailVerified: true,
    email: true,
    updatedAt: true,
  })
  .partial();

export type ListSubscriptionsByOrganizationIdInput = z.infer<
  typeof listSubscriptionsByOrganizationIdSchema
>;
export const listSubscriptionsByOrganizationIdSchema = z.object({
  organizationId: z.uuid(),
});
