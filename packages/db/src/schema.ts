import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

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

export const apiKeyTypeEnum = pgEnum("api_key_type", [
  "server",
  "client",
  "admin",
]);

export const organization = pgTable(
  "organization",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 256 }).notNull().unique(),
    description: text("description"),
    logoUrl: text("logo_url"),
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
    index("organization_slug_idx").on(table.slug),
    index("organization_deleted_at_idx").on(table.deletedAt),
  ]
);

export const organizationMember = pgTable(
  "organization_member",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: organizationMemberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("organization_member_org_user_idx").on(
      table.organizationId,
      table.userId
    ),
    index("organization_member_user_idx").on(table.userId),
    index("organization_member_org_idx").on(table.organizationId),
  ]
);

export const project = pgTable(
  "project",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
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
    color: varchar("color", { length: 7 }), // Hex color for UI
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
    maintainerId: text("maintainer_id").references(() => user.id),
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
    value: jsonb("value").notNull(), // Can be boolean, string, number, or JSON
    description: text("description"),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flag_environment_flag_env_idx").on(
      table.featureFlagId,
      table.environmentId
    ),
    index("feature_flag_environment_env_idx").on(table.environmentId),
  ]
);

// Attribute Definition - Tracks attributes for UI dropdowns (both manually defined and auto-discovered)
export const attribute = pgTable(
  "attribute",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    // Dot-notation key path (e.g., "user.plan", "device.os", "location.country")
    key: varchar("key", { length: 256 }).notNull(),
    // Display name for UI (e.g., "User Plan", "Device OS", "Country")
    displayName: varchar("display_name", { length: 256 }),
    // Description for UI tooltips/help text
    description: text("description"),
    // Data type (string, number, boolean, array, object) - can be set manually or inferred
    type: varchar("type", { length: 32 }), // 'string', 'number', 'boolean', 'array', 'object'
    // Whether this was manually defined by user or auto-discovered from evaluations
    isManual: boolean("is_manual").notNull().default(false),
    // User who manually created this (if isManual = true)
    createdById: text("created_by_id").references(() => user.id),
    // Which project this attribute belongs to
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    // Count of how many times this attribute has been seen in evaluations (for sorting/popularity)
    usageCount: integer("usage_count").notNull().default(0),
    // First time this attribute was seen (null if manually created before any usage)
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    // Last time this attribute was seen
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
  ]
);

// Attribute Values - Tracks distinct values for each attribute (both manually defined and discovered)
export const attributeValue = pgTable(
  "attribute_value",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    attributeId: uuid("attribute_id")
      .notNull()
      .references(() => attribute.id, { onDelete: "cascade" }),
    // The actual value as text (for string/number/boolean)
    value: text("value").notNull(),
    // The value as JSONB (for complex values)
    valueJson: jsonb("value_json"),
    // Display label for UI (e.g., "Premium Plan" instead of just "premium")
    displayLabel: varchar("display_label", { length: 256 }),
    // Whether this value was manually defined or auto-discovered
    isManual: boolean("is_manual").notNull().default(false),
    // User who manually created this (if isManual = true)
    createdById: text("created_by_id").references(() => user.id),
    // Count of how many times this value has been seen in evaluations
    usageCount: integer("usage_count").notNull().default(0),
    // First time this value was seen (null if manually created before any usage)
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    // Last time this value was seen
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

// Targeting & Segmentation
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
        attribute: string;
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

export const featureFlagTargeting = pgTable(
  "feature_flag_targeting",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => environment.id, { onDelete: "cascade" }),
    segmentId: uuid("segment_id").references(() => segment.id, {
      onDelete: "cascade",
    }),
    variationId: uuid("variation_id")
      .notNull()
      .references(() => featureFlagVariation.id, { onDelete: "cascade" }),
    rolloutPercentage: doublePrecision("rollout_percentage")
      .notNull()
      .default(0),
    priority: integer("priority").notNull().default(0), // Higher priority = evaluated first
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("feature_flag_targeting_flag_env_idx").on(
      table.featureFlagId,
      table.environmentId
    ),
    index("feature_flag_targeting_segment_idx").on(table.segmentId),
    index("feature_flag_targeting_priority_idx").on(
      table.featureFlagId,
      table.environmentId,
      table.priority
    ),
  ]
);

// API Keys
export const apiKey = pgTable(
  "api_key",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    keyHash: text("key_hash").notNull().unique(), // Hashed API key
    keyPrefix: varchar("key_prefix", { length: 16 }).notNull(), // First 8 chars for display
    type: apiKeyTypeEnum("type").notNull().default("server"),
    projectId: uuid("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    environmentIds: jsonb("environment_ids").$type<string[]>().default([]),
    // Rate limiting
    rateLimitRequests: integer("rate_limit_requests"), // Requests per period
    rateLimitPeriodSeconds: integer("rate_limit_period_seconds"), // Period in seconds
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdById: text("created_by_id")
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

// Evaluation & Analytics
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
    // Full context object from SDK initialization - stores exactly what developers pass
    // Example: { user: {...}, device: {...}, location: {...}, company: {...}, ... }
    context: jsonb("context").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"), // Auto-detected from request
    userAgent: text("user_agent"), // Auto-detected from request
    // Evaluation result
    value: jsonb("value"), // The evaluated value
    reason: text("reason"), // Why this value was returned (e.g., "matched_segment", "default_variation")
    sdkKey: text("sdk_key"),
    sdkVersion: text("sdk_version"),
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
    // Note: GIN index for JSONB context should be added via migrations for optimal query performance:
    // CREATE INDEX feature_flag_evaluation_context_gin_idx ON feature_flag_evaluation USING gin (context);
    // This enables fast queries like: WHERE context->'user'->>'email' = 'user@example.com'
    // Partitioning-friendly index for time-series queries
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

// Flag Dependencies - Track flag relationships (e.g., Flag A requires Flag B to be enabled)
export const featureFlagDependency = pgTable(
  "feature_flag_dependency",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    dependsOnFlagId: uuid("depends_on_flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    dependencyType: flagDependencyTypeEnum("dependency_type")
      .notNull()
      .default("requires"),
    // Environment-specific dependency (null = all environments)
    environmentId: uuid("environment_id").references(() => environment.id, {
      onDelete: "cascade",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("feature_flag_dependency_flag_idx").on(table.featureFlagId),
    index("feature_flag_dependency_depends_on_idx").on(table.dependsOnFlagId),
    index("feature_flag_dependency_env_idx").on(table.environmentId),
  ]
);

// Flag Scheduling - Schedule flag enable/disable at specific times
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
    // What action to take (enable/disable/change_variation)
    action: varchar("action", { length: 64 }).notNull(), // 'enable', 'disable', 'set_variation'
    // Target variation if action is 'set_variation'
    targetVariationId: uuid("target_variation_id").references(
      () => featureFlagVariation.id,
      { onDelete: "set null" }
    ),
    // When to execute this schedule
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    // Whether this is a one-time or recurring schedule
    isRecurring: boolean("is_recurring").notNull().default(false),
    // Recurrence pattern (cron expression or interval)
    recurrencePattern: text("recurrence_pattern"),
    // Whether this schedule has been executed
    executedAt: timestamp("executed_at", { withTimezone: true }),
    // Whether this schedule is active
    enabled: boolean("enabled").notNull().default(true),
    createdById: text("created_by_id")
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

// Change Requests - Approval workflow for flag changes
export const changeRequest = pgTable(
  "change_request",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    title: varchar("title", { length: 256 }).notNull(),
    description: text("description"),
    status: changeRequestStatusEnum("status").notNull().default("draft"),
    // The changes being requested (JSONB for flexibility)
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
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id),
    // Reviewers who need to approve
    reviewerIds: jsonb("reviewer_ids").$type<string[]>().default([]),
    // Approvals received
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
    mergedById: text("merged_by_id").references(() => user.id),
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

// Flag Templates - Reusable flag configurations
export const flagTemplate = pgTable(
  "flag_template",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    name: varchar("name", { length: 256 }).notNull(),
    description: text("description"),
    // Template configuration (variations, default values, etc.)
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
    // Whether this is a system template or user-created
    isSystem: boolean("is_system").notNull().default(false),
    createdById: text("created_by_id")
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

// Flag Version History - Snapshot of flag state at each version
export const featureFlagVersion = pgTable(
  "feature_flag_version",
  {
    id: uuid("id").notNull().primaryKey().defaultRandom(),
    featureFlagId: uuid("feature_flag_id")
      .notNull()
      .references(() => featureFlag.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    // Snapshot of flag state at this version
    snapshot: jsonb("snapshot").notNull().$type<{
      name: string;
      description: string;
      type: string;
      variations: unknown[];
      targetings: unknown[];
    }>(),
    // What changed in this version
    changeDescription: text("change_description"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("feature_flag_version_flag_version_idx").on(
      table.featureFlagId,
      table.version
    ),
    index("feature_flag_version_flag_idx").on(table.featureFlagId),
  ]
);

// Audit Logging
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
    userId: text("user_id")
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

// Relations
export const organizationRelations = relations(organization, ({ many }) => ({
  members: many(organizationMember),
  projects: many(project),
  environments: many(environment),
  featureFlags: many(featureFlag),
  segments: many(segment),
  apiKeys: many(apiKey),
  auditLogs: many(auditLog),
}));

export const organizationMemberRelations = relations(
  organizationMember,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationMember.organizationId],
      references: [organization.id],
    }),
    user: one(user, {
      fields: [organizationMember.userId],
      references: [user.id],
    }),
  })
);

export const projectRelations = relations(project, ({ one, many }) => ({
  organization: one(organization, {
    fields: [project.organizationId],
    references: [organization.id],
  }),
  environments: many(environment),
  featureFlags: many(featureFlag),
  segments: many(segment),
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
  featureFlagTargetings: many(featureFlagTargeting),
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
  variations: many(featureFlagVariation),
  environments: many(featureFlagEnvironment),
  targetings: many(featureFlagTargeting),
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
    targetings: many(featureFlagTargeting),
    evaluations: many(featureFlagEvaluation),
  })
);

export const featureFlagEnvironmentRelations = relations(
  featureFlagEnvironment,
  ({ one }) => ({
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
  })
);

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
  targetings: many(featureFlagTargeting),
}));

export const featureFlagTargetingRelations = relations(
  featureFlagTargeting,
  ({ one }) => ({
    featureFlag: one(featureFlag, {
      fields: [featureFlagTargeting.featureFlagId],
      references: [featureFlag.id],
    }),
    environment: one(environment, {
      fields: [featureFlagTargeting.environmentId],
      references: [environment.id],
    }),
    segment: one(segment, {
      fields: [featureFlagTargeting.segmentId],
      references: [segment.id],
    }),
    variation: one(featureFlagVariation, {
      fields: [featureFlagTargeting.variationId],
      references: [featureFlagVariation.id],
    }),
  })
);

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
