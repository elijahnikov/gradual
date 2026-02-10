import { relations } from "drizzle-orm";
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

export * from "./auth-schema";

export const organizationMemberRoleEnum = pgEnum("organization_member_role", [
  "owner",
  "admin",
  "member",
  "viewer",
]);

export const featureFlagStatusEnum = pgEnum("feature_flag_status", [
  "active",
  "archived",
  "draft",
]);

export const featureFlagTypeEnum = pgEnum("feature_flag_type", [
  "boolean",
  "string",
  "number",
  "json",
]);

export const targetingOperatorEnum = pgEnum("targeting_operator", [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "in",
  "not_in",
  "exists",
  "not_exists",
]);

export const auditLogActionEnum = pgEnum("audit_log_action", [
  "create",
  "update",
  "delete",
  "archive",
  "restore",
  "publish",
  "unpublish",
  "evaluate",
]);

export const changeRequestStatusEnum = pgEnum("change_request_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "merged",
]);

export const flagDependencyTypeEnum = pgEnum("flag_dependency_type", [
  "requires",
  "conflicts",
]);

export const targetTypeEnum = pgEnum("target_type", [
  "rule",
  "individual",
  "segment",
]);

export const contextKindEnum = pgEnum("context_kind", [
  "user",
  "device",
  "organization",
  "location",
]);

export const project = pgTable(
  "project",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    icon: varchar("icon", { length: 256 }),
    emoji: varchar("emoji", { length: 256 }),
    slug: varchar("slug", { length: 256 }).notNull(),
    description: text("description"),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("project_org_slug_idx").on(table.organizationId, table.slug),
    index("project_org_idx").on(table.organizationId),
    index("project_deleted_at_idx").on(table.deletedAt),
  ]
);

export const environment = pgTable(
  "environment",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    color: varchar("color", { length: 7 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("environment_project_slug_idx").on(table.projectId, table.slug),
    index("environment_project_idx").on(table.projectId),
    index("environment_org_idx").on(table.organizationId),
    index("environment_deleted_at_idx").on(table.deletedAt),
  ]
);

export const featureFlag = pgTable(
  "feature_flag",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    key: varchar("key", { length: 256 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    type: featureFlagTypeEnum("type").notNull().default("boolean"),
    status: featureFlagStatusEnum("status").notNull().default("draft"),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    tags: jsonb("tags").$type<string[]>().default([]),
    maintainerId: uuid("maintainer_id").references(() => user.id),
    createdById: uuid("created_by_id").references(() => user.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flag_project_key_idx").on(table.projectId, table.key),
    index("feature_flag_project_idx").on(table.projectId),
    index("feature_flag_org_idx").on(table.organizationId),
    index("feature_flag_status_idx").on(table.status),
    index("feature_flag_key_idx").on(table.key),
    index("feature_flag_archived_at_idx").on(table.archivedAt),
  ]
);

export const featureFlagVariation = pgTable(
  "feature_flag_variation",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 256 }).notNull(),
    value: jsonb("value").notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }),
    isDefault: boolean("is_default").notNull().default(false),
    rolloutPercentage: doublePrecision("rollout_percentage")
      .notNull()
      .default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flag_variation_flag_idx").on(table.featureFlagId),
    index("feature_flag_variation_default_idx").on(
      table.featureFlagId,
      table.isDefault
    ),
  ]
);

export const featureFlagEnvironment = pgTable(
  "feature_flag_environment",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => environment.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(false),
    defaultVariationId: uuid("default_variation_id").references(
      () => featureFlagVariation.id,
      { onDelete: "set null" }
    ),
    offVariationId: uuid("off_variation_id").references(
      () => featureFlagVariation.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("feature_flag_environment_flag_env_unique").on(
      table.featureFlagId,
      table.environmentId
    ),
    index("feature_flag_environment_flag_env_idx").on(
      table.featureFlagId,
      table.environmentId
    ),
    index("feature_flag_environment_env_idx").on(table.environmentId),
  ]
);

export const featureFlagTarget = pgTable(
  "feature_flag_target",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    featureFlagEnvironmentId: uuid("feature_flag_environment_id")
      .notNull()
      .references(() => featureFlagEnvironment.id, { onDelete: "cascade" }),
    variationId: uuid("variation_id").references(
      () => featureFlagVariation.id,
      {
        onDelete: "set null",
      }
    ),
    type: targetTypeEnum("type").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flag_target_env_idx").on(table.featureFlagEnvironmentId),
    index("feature_flag_target_env_sort_idx").on(
      table.featureFlagEnvironmentId,
      table.sortOrder
    ),
    index("feature_flag_target_type_idx").on(table.type),
  ]
);

export const featureFlagTargetingRule = pgTable(
  "feature_flag_targeting_rule",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => featureFlagTarget.id, { onDelete: "cascade" }),
    contextKind: varchar("context_kind", { length: 256 }).notNull(),
    attributeKey: varchar("attribute_key", { length: 256 }).notNull(),
    operator: targetingOperatorEnum("operator").notNull(),
    value: jsonb("value").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("feature_flag_targeting_rule_target_idx").on(table.targetId),
    index("feature_flag_targeting_rule_sort_idx").on(
      table.targetId,
      table.sortOrder
    ),
  ]
);

export const featureFlagIndividualTarget = pgTable(
  "feature_flag_individual_target",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => featureFlagTarget.id, { onDelete: "cascade" })
      .unique(),
    contextKind: varchar("context_kind", { length: 256 }).notNull(),
    attributeKey: varchar("attribute_key", { length: 256 }).notNull(),
    attributeValue: text("attribute_value").notNull(),
    attributeValueJson: jsonb("attribute_value_json"),
  },
  (table) => [
    index("feature_flag_individual_target_target_idx").on(table.targetId),
    index("feature_flag_individual_target_key_value_idx").on(
      table.attributeKey,
      table.attributeValue
    ),
  ]
);

export const featureFlagSegmentTarget = pgTable(
  "feature_flag_segment_target",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => featureFlagTarget.id, { onDelete: "cascade" })
      .unique(),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => segment.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("feature_flag_segment_target_target_idx").on(table.targetId),
    index("feature_flag_segment_target_segment_idx").on(table.segmentId),
  ]
);

export const featureFlagTargetRollout = pgTable(
  "feature_flag_target_rollout",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    targetId: uuid("target_id")
      .notNull()
      .references(() => featureFlagTarget.id, { onDelete: "cascade" })
      .unique(),
    bucketContextKind: varchar("bucket_context_kind", { length: 256 })
      .notNull()
      .default("user"),
    bucketAttributeKey: varchar("bucket_attribute_key", { length: 256 })
      .notNull()
      .default("id"),
    seed: varchar("seed", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flag_target_rollout_target_idx").on(table.targetId),
  ]
);

export const featureFlagRolloutVariation = pgTable(
  "feature_flag_rollout_variation",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    rolloutId: uuid("rollout_id")
      .notNull()
      .references(() => featureFlagTargetRollout.id, { onDelete: "cascade" }),
    variationId: uuid("variation_id")
      .notNull()
      .references(() => featureFlagVariation.id, { onDelete: "cascade" }),
    weight: integer("weight").notNull(), // 0-100000 for 0.001% precision
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("feature_flag_rollout_variation_rollout_idx").on(table.rolloutId),
    index("feature_flag_rollout_variation_sort_idx").on(
      table.rolloutId,
      table.sortOrder
    ),
  ]
);

export const featureFlagDefaultRollout = pgTable(
  "feature_flag_default_rollout",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    flagEnvironmentId: uuid("flag_environment_id")
      .notNull()
      .references(() => featureFlagEnvironment.id, { onDelete: "cascade" })
      .unique(),
    bucketContextKind: varchar("bucket_context_kind", { length: 256 })
      .notNull()
      .default("user"),
    bucketAttributeKey: varchar("bucket_attribute_key", { length: 256 })
      .notNull()
      .default("id"),
    seed: varchar("seed", { length: 256 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flag_default_rollout_env_idx").on(table.flagEnvironmentId),
  ]
);

export const featureFlagDefaultRolloutVariation = pgTable(
  "feature_flag_default_rollout_variation",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    defaultRolloutId: uuid("default_rollout_id")
      .notNull()
      .references(() => featureFlagDefaultRollout.id, { onDelete: "cascade" }),
    variationId: uuid("variation_id")
      .notNull()
      .references(() => featureFlagVariation.id, { onDelete: "cascade" }),
    weight: integer("weight").notNull(), // 0-100000 for 0.001% precision
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    index("feature_flag_default_rollout_variation_rollout_idx").on(
      table.defaultRolloutId
    ),
    index("feature_flag_default_rollout_variation_sort_idx").on(
      table.defaultRolloutId,
      table.sortOrder
    ),
  ]
);

export const context = pgTable(
  "context",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    kind: varchar("kind", { length: 256 }).notNull(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("context_project_kind_idx").on(table.projectId, table.kind),
    unique("context_project_kind_unique").on(table.projectId, table.kind),
  ]
);

export const attribute = pgTable(
  "attribute",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    key: varchar("key", { length: 256 }).notNull(),
    displayName: varchar("display_name", { length: 256 }),
    description: text("description"),
    type: varchar("type", { length: 32 }),
    isManual: boolean("is_manual").notNull().default(false),
    createdById: uuid("created_by_id").references(() => user.id),
    contextId: uuid("context_id").references(() => context.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    usageCount: integer("usage_count").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("attribute_project_key_idx").on(table.projectId, table.key),
    index("attribute_project_idx").on(table.projectId),
    index("attribute_org_idx").on(table.organizationId),
    index("attribute_usage_count_idx").on(table.usageCount),
    index("attribute_is_manual_idx").on(table.isManual),
    index("attribute_context_idx").on(table.contextId),
  ]
);

export const attributeValue = pgTable(
  "attribute_value",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attribute.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    valueJson: jsonb("value_json"),
    displayLabel: varchar("display_label", { length: 256 }),
    isManual: boolean("is_manual").notNull().default(false),
    createdById: uuid("created_by_id").references(() => user.id),
    usageCount: integer("usage_count").notNull().default(0),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("attribute_value_attribute_value_idx").on(
      table.attributeId,
      table.value
    ),
    index("attribute_value_attribute_idx").on(table.attributeId),
    index("attribute_value_usage_count_idx").on(table.usageCount),
    index("attribute_value_is_manual_idx").on(table.isManual),
  ]
);

export const segment = pgTable(
  "segment",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    key: varchar("key", { length: 256 }).notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    conditions: jsonb("conditions").notNull().$type<
      Array<{
        contextKind: string;
        attributeKey: string;
        operator: string;
        value: unknown;
      }>
    >(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("segment_project_key_idx").on(table.projectId, table.key),
    index("segment_project_idx").on(table.projectId),
    index("segment_org_idx").on(table.organizationId),
    index("segment_deleted_at_idx").on(table.deletedAt),
  ]
);

export const apiKey = pgTable(
  "api_key",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    key: text("key").notNull().unique(),
    keyHash: text("key_hash").notNull().unique(),
    keyPrefix: varchar("key_prefix", { length: 16 }).notNull(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    environmentIds: jsonb("environment_ids").$type<string[]>().default([]),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("api_key_project_idx").on(table.projectId),
    index("api_key_org_idx").on(table.organizationId),
    index("api_key_hash_idx").on(table.keyHash),
    index("api_key_revoked_at_idx").on(table.revokedAt),
  ]
);

export const featureFlagEvaluation = pgTable(
  "feature_flag_evaluation",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => environment.id, { onDelete: "cascade" }),
    variationId: uuid("variation_id").references(
      () => featureFlagVariation.id,
      {
        onDelete: "set null",
      }
    ),
    context: jsonb("context").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    value: jsonb("value"),
    reason: text("reason"),
    reasons: jsonb("reasons").$type<unknown[]>(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }),
    ruleId: text("rule_id"),
    sdkKey: text("sdk_key"),
    sdkVersion: text("sdk_version"),
    matchedTargetName: text("matched_target_name"),
    flagConfigVersion: bigint("flag_config_version", { mode: "number" }),
    sdkPlatform: text("sdk_platform"),
    errorDetail: text("error_detail"),
    evaluationDurationUs: integer("evaluation_duration_us"),
    isAnonymous: boolean("is_anonymous"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("feature_flag_evaluation_flag_env_idx").on(
      table.featureFlagId,
      table.environmentId
    ),
    index("feature_flag_evaluation_created_at_idx").on(table.createdAt),
    index("feature_flag_evaluation_flag_created_idx").on(
      table.featureFlagId,
      table.createdAt
    ),
  ]
);

export const contextAttribute = pgTable(
  "context_attribute",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => featureFlagEvaluation.id, { onDelete: "cascade" }),
    key: varchar("key", { length: 256 }).notNull(),
    value: text("value"),
    valueJson: jsonb("value_json"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("context_attribute_evaluation_idx").on(table.evaluationId),
    index("context_attribute_key_value_idx").on(table.key, table.value),
    index("context_attribute_key_value_eval_idx").on(
      table.key,
      table.value,
      table.evaluationId
    ),
  ]
);

export const featureFlagSchedule = pgTable(
  "feature_flag_schedule",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => environment.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 64 }).notNull(),
    targetVariationId: uuid("target_variation_id").references(
      () => featureFlagVariation.id,
      { onDelete: "set null" }
    ),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    isRecurring: boolean("is_recurring").notNull().default(false),
    recurrencePattern: text("recurrence_pattern"),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    enabled: boolean("enabled").notNull().default(true),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flag_schedule_flag_env_idx").on(
      table.featureFlagId,
      table.environmentId
    ),
    index("feature_flag_schedule_scheduled_at_idx").on(table.scheduledAt),
    index("feature_flag_schedule_enabled_idx").on(table.enabled),
  ]
);

export const changeRequest = pgTable(
  "change_request",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    status: changeRequestStatusEnum("status").notNull().default("draft"),
    changes: jsonb("changes").notNull().$type<{
      featureFlagId: string;
      environmentId: string;
      changes: Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }>;
    }>(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => user.id),
    reviewerIds: jsonb("reviewer_ids").$type<string[]>().default([]),
    approvals: jsonb("approvals")
      .$type<
        Array<{
          userId: string;
          approvedAt: string;
          comment?: string;
        }>
      >()
      .default([]),
    mergedAt: timestamp("merged_at", { withTimezone: true }),
    mergedById: uuid("merged_by_id").references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("change_request_project_status_idx").on(
      table.projectId,
      table.status
    ),
    index("change_request_org_idx").on(table.organizationId),
    index("change_request_created_by_idx").on(table.createdById),
    index("change_request_status_idx").on(table.status),
  ]
);

export const flagTemplate = pgTable(
  "flag_template",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    config: jsonb("config").notNull().$type<{
      type: string;
      variations: Array<{
        name: string;
        value: unknown;
        isDefault: boolean;
      }>;
      defaultTargeting?: unknown;
    }>(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    isSystem: boolean("is_system").notNull().default(false),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => user.id),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("flag_template_org_idx").on(table.organizationId),
    index("flag_template_is_system_idx").on(table.isSystem),
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    action: auditLogActionEnum("action").notNull(),
    resourceType: varchar("resource_type", { length: 64 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }).notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "set null" }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_log_org_created_idx").on(
      table.organizationId,
      table.createdAt
    ),
    index("audit_log_resource_idx").on(table.resourceType, table.resourceId),
    index("audit_log_user_idx").on(table.userId),
    index("audit_log_project_idx").on(table.projectId),
  ]
);

export const organizationRelations = relations(organization, ({ many }) => ({
  projects: many(project),
  environments: many(environment),
  featureFlags: many(featureFlag),
  segments: many(segment),
  apiKeys: many(apiKey),
  auditLogs: many(auditLog),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
  }),
  environments: many(environment),
  featureFlags: many(featureFlag),
  segments: many(segment),
  contexts: many(context),
  attributes: many(attribute),
  apiKeys: many(apiKey),
  auditLogs: many(auditLog),
}));

export const environmentRelations = relations(environment, ({ one, many }) => ({
  project: one(project, {
    fields: [environment.projectId],
    references: [project.id],
  }),
  organization: one(organization, {
    fields: [environment.organizationId],
    references: [organization.id],
  }),
  featureFlagEnvironments: many(featureFlagEnvironment),
  evaluations: many(featureFlagEvaluation),
}));

export const featureFlagRelations = relations(featureFlag, ({ one, many }) => ({
  project: one(project, {
    fields: [featureFlag.projectId],
    references: [project.id],
  }),
  organization: one(organization, {
    fields: [featureFlag.organizationId],
    references: [organization.id],
  }),
  maintainer: one(user, {
    fields: [featureFlag.maintainerId],
    references: [user.id],
  }),
  creator: one(user, {
    fields: [featureFlag.createdById],
    references: [user.id],
  }),
  variations: many(featureFlagVariation),
  environments: many(featureFlagEnvironment),
  evaluations: many(featureFlagEvaluation),
}));

export const featureFlagVariationRelations = relations(
  featureFlagVariation,
  ({ one, many }) => ({
    featureFlag: one(featureFlag, {
      fields: [featureFlagVariation.featureFlagId],
      references: [featureFlag.id],
    }),
    defaultForEnvironments: many(featureFlagEnvironment),
    evaluations: many(featureFlagEvaluation),
    targets: many(featureFlagTarget),
  })
);

export const featureFlagEnvironmentRelations = relations(
  featureFlagEnvironment,
  ({ one, many }) => ({
    featureFlag: one(featureFlag, {
      fields: [featureFlagEnvironment.featureFlagId],
      references: [featureFlag.id],
    }),
    environment: one(environment, {
      fields: [featureFlagEnvironment.environmentId],
      references: [environment.id],
    }),
    defaultVariation: one(featureFlagVariation, {
      fields: [featureFlagEnvironment.defaultVariationId],
      references: [featureFlagVariation.id],
    }),
    targets: many(featureFlagTarget),
    defaultRollout: one(featureFlagDefaultRollout),
  })
);

export const featureFlagTargetRelations = relations(
  featureFlagTarget,
  ({ one, many }) => ({
    featureFlagEnvironment: one(featureFlagEnvironment, {
      fields: [featureFlagTarget.featureFlagEnvironmentId],
      references: [featureFlagEnvironment.id],
    }),
    variation: one(featureFlagVariation, {
      fields: [featureFlagTarget.variationId],
      references: [featureFlagVariation.id],
    }),
    rules: many(featureFlagTargetingRule),
    individual: one(featureFlagIndividualTarget),
    segment: one(featureFlagSegmentTarget),
    rollout: one(featureFlagTargetRollout),
  })
);

export const featureFlagTargetingRuleRelations = relations(
  featureFlagTargetingRule,
  ({ one }) => ({
    target: one(featureFlagTarget, {
      fields: [featureFlagTargetingRule.targetId],
      references: [featureFlagTarget.id],
    }),
  })
);

export const featureFlagIndividualTargetRelations = relations(
  featureFlagIndividualTarget,
  ({ one }) => ({
    target: one(featureFlagTarget, {
      fields: [featureFlagIndividualTarget.targetId],
      references: [featureFlagTarget.id],
    }),
  })
);

export const featureFlagSegmentTargetRelations = relations(
  featureFlagSegmentTarget,
  ({ one }) => ({
    target: one(featureFlagTarget, {
      fields: [featureFlagSegmentTarget.targetId],
      references: [featureFlagTarget.id],
    }),
    segment: one(segment, {
      fields: [featureFlagSegmentTarget.segmentId],
      references: [segment.id],
    }),
  })
);

export const featureFlagTargetRolloutRelations = relations(
  featureFlagTargetRollout,
  ({ one, many }) => ({
    target: one(featureFlagTarget, {
      fields: [featureFlagTargetRollout.targetId],
      references: [featureFlagTarget.id],
    }),
    variations: many(featureFlagRolloutVariation),
  })
);

export const featureFlagRolloutVariationRelations = relations(
  featureFlagRolloutVariation,
  ({ one }) => ({
    rollout: one(featureFlagTargetRollout, {
      fields: [featureFlagRolloutVariation.rolloutId],
      references: [featureFlagTargetRollout.id],
    }),
    variation: one(featureFlagVariation, {
      fields: [featureFlagRolloutVariation.variationId],
      references: [featureFlagVariation.id],
    }),
  })
);

export const featureFlagDefaultRolloutRelations = relations(
  featureFlagDefaultRollout,
  ({ one, many }) => ({
    flagEnvironment: one(featureFlagEnvironment, {
      fields: [featureFlagDefaultRollout.flagEnvironmentId],
      references: [featureFlagEnvironment.id],
    }),
    variations: many(featureFlagDefaultRolloutVariation),
  })
);

export const featureFlagDefaultRolloutVariationRelations = relations(
  featureFlagDefaultRolloutVariation,
  ({ one }) => ({
    defaultRollout: one(featureFlagDefaultRollout, {
      fields: [featureFlagDefaultRolloutVariation.defaultRolloutId],
      references: [featureFlagDefaultRollout.id],
    }),
    variation: one(featureFlagVariation, {
      fields: [featureFlagDefaultRolloutVariation.variationId],
      references: [featureFlagVariation.id],
    }),
  })
);

export const contextRelations = relations(context, ({ one, many }) => ({
  project: one(project, {
    fields: [context.projectId],
    references: [project.id],
  }),
  organization: one(organization, {
    fields: [context.organizationId],
    references: [organization.id],
  }),
  attributes: many(attribute),
}));

export const attributeRelations = relations(attribute, ({ one, many }) => ({
  project: one(project, {
    fields: [attribute.projectId],
    references: [project.id],
  }),
  organization: one(organization, {
    fields: [attribute.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [attribute.createdById],
    references: [user.id],
  }),
  context: one(context, {
    fields: [attribute.contextId],
    references: [context.id],
  }),
  values: many(attributeValue),
}));

export const attributeValueRelations = relations(attributeValue, ({ one }) => ({
  attribute: one(attribute, {
    fields: [attributeValue.attributeId],
    references: [attribute.id],
  }),
  createdBy: one(user, {
    fields: [attributeValue.createdById],
    references: [user.id],
  }),
}));

export const segmentRelations = relations(segment, ({ one, many }) => ({
  project: one(project, {
    fields: [segment.projectId],
    references: [project.id],
  }),
  organization: one(organization, {
    fields: [segment.organizationId],
    references: [organization.id],
  }),
  flagTargets: many(featureFlagSegmentTarget),
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  project: one(project, {
    fields: [apiKey.projectId],
    references: [project.id],
  }),
  organization: one(organization, {
    fields: [apiKey.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [apiKey.createdById],
    references: [user.id],
  }),
}));

export const featureFlagEvaluationRelations = relations(
  featureFlagEvaluation,
  ({ one, many }) => ({
    featureFlag: one(featureFlag, {
      fields: [featureFlagEvaluation.featureFlagId],
      references: [featureFlag.id],
    }),
    environment: one(environment, {
      fields: [featureFlagEvaluation.environmentId],
      references: [environment.id],
    }),
    variation: one(featureFlagVariation, {
      fields: [featureFlagEvaluation.variationId],
      references: [featureFlagVariation.id],
    }),
    contextAttributes: many(contextAttribute),
  })
);

export const contextAttributeRelations = relations(
  contextAttribute,
  ({ one }) => ({
    evaluation: one(featureFlagEvaluation, {
      fields: [contextAttribute.evaluationId],
      references: [featureFlagEvaluation.id],
    }),
  })
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organization, {
    fields: [auditLog.organizationId],
    references: [organization.id],
  }),
  project: one(project, {
    fields: [auditLog.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [auditLog.userId],
    references: [user.id],
  }),
}));
