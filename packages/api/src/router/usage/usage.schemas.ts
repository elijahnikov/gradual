import z from "zod/v4";

export type GetUsageByOrganizationIdInput = z.infer<
  typeof getUsageByOrganizationIdSchema
>;
export const getUsageByOrganizationIdSchema = z.object({
  organizationId: z.uuid(),
});
