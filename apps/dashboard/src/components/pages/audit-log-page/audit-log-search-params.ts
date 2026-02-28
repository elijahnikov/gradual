import { parseAsString, parseAsStringLiteral } from "nuqs";

const actionOptions = [
  "create",
  "update",
  "delete",
  "archive",
  "restore",
  "publish",
  "unpublish",
] as const;

const resourceTypeOptions = [
  "feature_flag",
  "environment",
  "segment",
  "project",
  "organization",
  "organization_member",
  "api_key",
  "snapshot",
  "webhook",
] as const;

export type ActionFilter = (typeof actionOptions)[number];
export type ResourceTypeFilter = (typeof resourceTypeOptions)[number];

export const auditLogSearchParams = {
  action: parseAsStringLiteral(actionOptions),
  resourceType: parseAsStringLiteral(resourceTypeOptions),
  userId: parseAsString,
  search: parseAsString,
  startDate: parseAsString,
  endDate: parseAsString,
};

export const resourceTypeLabels: Record<ResourceTypeFilter, string> = {
  feature_flag: "Feature Flag",
  environment: "Environment",
  segment: "Segment",
  project: "Project",
  organization: "Organization",
  organization_member: "Member",
  api_key: "API Key",
  snapshot: "Snapshot",
  webhook: "Webhook",
};

export const actionLabels: Record<ActionFilter, string> = {
  create: "Create",
  update: "Update",
  delete: "Delete",
  archive: "Archive",
  restore: "Restore",
  publish: "Publish",
  unpublish: "Unpublish",
};
