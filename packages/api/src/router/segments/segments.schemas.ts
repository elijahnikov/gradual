import { createInsertSchema } from "@gradual/db";
import { segment } from "@gradual/db/schema";
import z from "zod/v4";

export type ListSegmentsInput = z.infer<typeof listSegmentsSchema>;
export const listSegmentsSchema = z.object({
  projectSlug: z.string(),
  organizationSlug: z.string(),
});

const segmentConditionSchema = z.object({
  attribute: z.string(),
  operator: z.string(),
  value: z.unknown(),
});

export type CreateSegmentInput = z.infer<typeof createSegmentSchema>;
export const createSegmentSchema = createInsertSchema(segment)
  .omit({
    id: true,
    projectId: true,
    organizationId: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  })
  .extend({
    projectSlug: z.string(),
    organizationSlug: z.string(),
    name: z.string().min(1, "Name is required"),
    key: z
      .string()
      .min(1, "Key is required")
      .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Key must be lowercase with hyphens, e.g., 'beta-users'"
      ),
    conditions: z.array(segmentConditionSchema).default([]),
  });
