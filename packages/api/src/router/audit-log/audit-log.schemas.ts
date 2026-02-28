import z from "zod/v4";

export type ListAuditLogsInput = z.infer<typeof listAuditLogsSchema>;
export const listAuditLogsSchema = z.object({
  organizationSlug: z.string(),
  projectSlug: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
  cursor: z.string().optional(),
  action: z
    .enum([
      "create",
      "update",
      "delete",
      "archive",
      "restore",
      "publish",
      "unpublish",
      "evaluate",
    ])
    .optional(),
  resourceType: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  search: z.string().optional(),
});

export type ExportAuditLogsInput = z.infer<typeof exportAuditLogsSchema>;
export const exportAuditLogsSchema = z.object({
  organizationSlug: z.string(),
  projectSlug: z.string().optional(),
  action: z
    .enum([
      "create",
      "update",
      "delete",
      "archive",
      "restore",
      "publish",
      "unpublish",
      "evaluate",
    ])
    .optional(),
  resourceType: z.string().optional(),
  userId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  search: z.string().optional(),
});
