import crypto from "node:crypto";
import { authEnv } from "@gradual/auth/env";
import { and, desc, eq, lt } from "@gradual/db";
import { webhook, webhookDelivery } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import { createAuditLog } from "../../lib/audit-log";
import type {
  ProtectedOrganizationTRPCContext,
  PublicTRPCContext,
} from "../../trpc";
import type {
  CreateWebhookInput,
  DeleteWebhookInput,
  DispatchWebhookInput,
  GetWebhookInput,
  ListWebhookDeliveriesInput,
  ListWebhooksInput,
  TestWebhookInput,
  UpdateWebhookInput,
} from "./webhooks.schemas";

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function generateSigningSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

function maskSecret(secret: string): string {
  return `${"•".repeat(8)}${secret.slice(-4)}`;
}

function signPayload(
  payload: string,
  secret: string,
  timestamp: number
): string {
  const signatureBody = `${timestamp}.${payload}`;
  return crypto
    .createHmac("sha256", secret)
    .update(signatureBody)
    .digest("hex");
}

interface WebhookEventFilters {
  actions: string[];
  resourceTypes: string[];
}

function eventMatchesFilters(
  action: string,
  resourceType: string,
  filters: WebhookEventFilters | null
): boolean {
  if (!filters) {
    return true;
  }
  if (filters.actions.length > 0 && !filters.actions.includes(action)) {
    return false;
  }
  if (
    filters.resourceTypes.length > 0 &&
    !filters.resourceTypes.includes(resourceType)
  ) {
    return false;
  }
  return true;
}

// --- CRUD ---

export const createWebhook = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateWebhookInput;
}) => {
  const signingSecret = generateSigningSecret();

  const [created] = await ctx.db
    .insert(webhook)
    .values({
      name: input.name,
      url: input.url,
      signingSecret,
      eventFilters: input.eventFilters,
      organizationId: ctx.organization.id,
      createdById: ctx.session.user.id,
    })
    .returning();

  if (!created) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create webhook",
    });
  }

  createAuditLog({
    ctx,
    action: "create",
    resourceType: "webhook",
    resourceId: created.id,
    metadata: { name: input.name, url: input.url },
  });

  return { ...created, signingSecret };
};

export const listWebhooks = async ({
  ctx,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListWebhooksInput;
}) => {
  const rows = await ctx.db.query.webhook.findMany({
    where: (w, { eq: e }) => e(w.organizationId, ctx.organization.id),
    orderBy: (w, { desc: d }) => [d(w.createdAt)],
    with: {
      createdBy: {
        columns: { id: true, name: true, email: true, image: true },
      },
    },
  });

  return rows.map((row) => ({
    ...row,
    signingSecret: maskSecret(row.signingSecret),
  }));
};

export const getWebhook = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetWebhookInput;
}) => {
  const row = await ctx.db.query.webhook.findFirst({
    where: (w, { eq: e, and: a }) =>
      a(e(w.id, input.id), e(w.organizationId, ctx.organization.id)),
    with: {
      createdBy: {
        columns: { id: true, name: true, email: true, image: true },
      },
    },
  });

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
  }

  return { ...row, signingSecret: maskSecret(row.signingSecret) };
};

export const updateWebhook = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: UpdateWebhookInput;
}) => {
  const existing = await ctx.db.query.webhook.findFirst({
    where: (w, { eq: e, and: a }) =>
      a(e(w.id, input.id), e(w.organizationId, ctx.organization.id)),
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
  }

  const updates: Partial<typeof webhook.$inferInsert> = {};
  if (input.name !== undefined) {
    updates.name = input.name;
  }
  if (input.url !== undefined) {
    updates.url = input.url;
  }
  if (input.enabled !== undefined) {
    updates.enabled = input.enabled;
  }
  if (input.eventFilters !== undefined) {
    updates.eventFilters = input.eventFilters;
  }
  if (input.regenerateSecret) {
    updates.signingSecret = generateSigningSecret();
  }

  const [updated] = await ctx.db
    .update(webhook)
    .set(updates)
    .where(eq(webhook.id, input.id))
    .returning();

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update webhook",
    });
  }

  createAuditLog({
    ctx,
    action: "update",
    resourceType: "webhook",
    resourceId: updated.id,
    metadata: { name: updated.name },
  });

  return { ...updated, signingSecret: maskSecret(updated.signingSecret) };
};

export const deleteWebhook = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: DeleteWebhookInput;
}) => {
  const existing = await ctx.db.query.webhook.findFirst({
    where: (w, { eq: e, and: a }) =>
      a(e(w.id, input.id), e(w.organizationId, ctx.organization.id)),
    columns: { id: true, name: true },
  });

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
  }

  await ctx.db.delete(webhook).where(eq(webhook.id, input.id));

  createAuditLog({
    ctx,
    action: "delete",
    resourceType: "webhook",
    resourceId: existing.id,
    metadata: { name: existing.name },
  });

  return { success: true };
};

// --- Test ---

export const testWebhook = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: TestWebhookInput;
}) => {
  const row = await ctx.db.query.webhook.findFirst({
    where: (w, { eq: e, and: a }) =>
      a(e(w.id, input.id), e(w.organizationId, ctx.organization.id)),
  });

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
  }

  const payload = {
    id: crypto.randomUUID(),
    event: "test.webhook",
    timestamp: new Date().toISOString(),
    data: {
      action: "test",
      resourceType: "webhook",
      resourceId: row.id,
      organizationId: ctx.organization.id,
      projectId: null,
      userId: ctx.session.user.id,
      metadata: { test: true },
    },
  };

  const payloadStr = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signPayload(payloadStr, row.signingSecret, timestamp);

  const start = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let success = false;
  let error: string | null = null;

  try {
    const res = await fetch(row.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Gradual-Signature": `t=${timestamp},v1=${signature}`,
        "X-Gradual-Event": "test.webhook",
      },
      body: payloadStr,
      signal: createTimeoutSignal(10_000),
    });
    responseStatus = res.status;
    responseBody = await res.text().catch(() => null);
    success = res.ok;
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  }

  const durationMs = Date.now() - start;

  await ctx.db.insert(webhookDelivery).values({
    webhookId: row.id,
    eventAction: "test",
    eventResourceType: "webhook",
    requestUrl: row.url,
    requestPayload: payload,
    responseStatus,
    responseBody,
    success,
    error,
    durationMs,
    attemptNumber: 1,
  });

  return { success, responseStatus, durationMs, error };
};

// --- Delivery log ---

export const listWebhookDeliveries = async ({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListWebhookDeliveriesInput;
}) => {
  // Verify webhook belongs to org
  const row = await ctx.db.query.webhook.findFirst({
    where: (w, { eq: e, and: a }) =>
      a(e(w.id, input.webhookId), e(w.organizationId, ctx.organization.id)),
    columns: { id: true },
  });

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Webhook not found" });
  }

  const { limit, cursor } = input;
  const conditions = [eq(webhookDelivery.webhookId, input.webhookId)];

  if (cursor) {
    conditions.push(lt(webhookDelivery.deliveredAt, new Date(cursor)));
  }

  const rows = await ctx.db
    .select()
    .from(webhookDelivery)
    .where(and(...conditions))
    .orderBy(desc(webhookDelivery.deliveredAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? items.at(-1)?.deliveredAt?.toISOString()
    : undefined;

  return { items, nextCursor };
};

// --- Internal dispatch (called by CF Worker) ---

export const dispatchWebhookEvent = async ({
  ctx,
  input,
}: {
  ctx: PublicTRPCContext;
  input: DispatchWebhookInput;
}) => {
  const expectedSecret = authEnv().CLOUDFLARE_WORKERS_ADMIN_KEY;
  if (!expectedSecret || input.workerSecret !== expectedSecret) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid worker secret",
    });
  }

  const webhooks = await ctx.db.query.webhook.findMany({
    where: (w, { eq: e, and: a }) =>
      a(e(w.organizationId, input.organizationId), e(w.enabled, true)),
  });

  const matchingWebhooks = webhooks.filter((w) =>
    eventMatchesFilters(
      input.action,
      input.resourceType,
      w.eventFilters as WebhookEventFilters | null
    )
  );

  const results: Array<{ webhookId: string; success: boolean }> = [];

  for (const wh of matchingWebhooks) {
    const payload = {
      id: crypto.randomUUID(),
      event: `${input.action}.${input.resourceType}`,
      timestamp: input.timestamp,
      data: {
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        organizationId: input.organizationId,
        projectId: input.projectId,
        userId: input.userId,
        metadata: input.metadata,
      },
    };

    const payloadStr = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signPayload(payloadStr, wh.signingSecret, timestamp);

    const start = Date.now();
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let success = false;
    let error: string | null = null;

    try {
      const res = await fetch(wh.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Gradual-Signature": `t=${timestamp},v1=${signature}`,
          "X-Gradual-Event": `${input.action}.${input.resourceType}`,
        },
        body: payloadStr,
        signal: createTimeoutSignal(10_000),
      });
      responseStatus = res.status;
      responseBody = await res.text().catch(() => null);
      success = res.ok;
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }

    const durationMs = Date.now() - start;

    void ctx.db
      .insert(webhookDelivery)
      .values({
        webhookId: wh.id,
        auditLogId: input.auditLogId,
        eventAction: input.action,
        eventResourceType: input.resourceType,
        requestUrl: wh.url,
        requestPayload: payload,
        responseStatus,
        responseBody,
        success,
        error,
        durationMs,
        attemptNumber: 1,
      })
      .catch((err: unknown) => {
        console.error("[Webhook] Failed to record delivery:", err);
      });

    results.push({ webhookId: wh.id, success });
  }

  return { dispatched: results.length, results };
};
