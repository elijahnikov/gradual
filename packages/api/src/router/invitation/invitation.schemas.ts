import z from "zod/v4";

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export const createInvitationSchema = z.object({
  organizationSlug: z.string(),
  email: z.string().email(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

export type ListInvitationsInput = z.infer<typeof listInvitationsSchema>;
export const listInvitationsSchema = z.object({
  organizationSlug: z.string(),
});

export type CancelInvitationInput = z.infer<typeof cancelInvitationSchema>;
export const cancelInvitationSchema = z.object({
  organizationSlug: z.string(),
  invitationId: z.string(),
});
