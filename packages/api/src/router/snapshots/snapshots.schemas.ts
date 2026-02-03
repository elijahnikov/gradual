import { z } from "zod/v4";

export const generateSnapshotSchema = z.object({
  projectSlug: z.string(),
  environmentSlug: z.string(),
});
export type GenerateSnapshotInput = z.infer<typeof generateSnapshotSchema>;

export const publishSnapshotSchema = z.object({
  projectSlug: z.string(),
  environmentSlug: z.string(),
});
export type PublishSnapshotInput = z.infer<typeof publishSnapshotSchema>;

export const publishAllSnapshotsSchema = z.object({
  projectSlug: z.string(),
});
export type PublishAllSnapshotsInput = z.infer<
  typeof publishAllSnapshotsSchema
>;

export const buildForWorkerSchema = z.object({
  orgId: z.string(),
  projectId: z.string(),
  environmentSlug: z.string(),
  workerSecret: z.string(),
});
export type BuildForWorkerInput = z.infer<typeof buildForWorkerSchema>;
