import { authEnv } from "@gradual/auth/env";
import { auditLog } from "@gradual/db/schema";
import type { ProtectedOrganizationTRPCContext } from "../trpc";

export type AuditLogAction =
  | "create"
  | "update"
  | "delete"
  | "archive"
  | "restore"
  | "publish"
  | "unpublish";

export type AuditLogResourceType =
  | "feature_flag"
  | "environment"
  | "segment"
  | "project"
  | "organization"
  | "organization_member"
  | "api_key"
  | "snapshot"
  | "webhook";

interface CreateAuditLogParams {
  ctx: ProtectedOrganizationTRPCContext;
  action: AuditLogAction;
  resourceType: AuditLogResourceType;
  resourceId: string;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log entry creation.
 * Does NOT await the insert — failures are logged to console but never block the caller.
 */
export function createAuditLog(params: CreateAuditLogParams): void {
  const { ctx, action, resourceType, resourceId, projectId, metadata } = params;

  const ipAddress =
    ctx.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ctx.headers?.get("x-real-ip") ??
    null;
  const userAgent = ctx.headers?.get("user-agent") ?? null;

  void ctx.db
    .insert(auditLog)
    .values({
      action,
      resourceType,
      resourceId,
      organizationId: ctx.organization.id,
      projectId: projectId ?? null,
      userId: ctx.session.user.id,
      metadata: metadata ?? null,
      ipAddress,
      userAgent,
    })
    .returning({ id: auditLog.id })
    .then((result) => {
      const auditLogId = result[0]?.id;
      console.log("[AuditLog] Insert result:", JSON.stringify(result));
      if (auditLogId) {
        console.log("[AuditLog] Queuing webhook dispatch for:", auditLogId);
        void queueWebhookDispatch({
          organizationId: ctx.organization.id,
          auditLogId,
          action,
          resourceType,
          resourceId,
          projectId: projectId ?? null,
          userId: ctx.session.user.id,
          metadata: metadata ?? null,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.warn("[AuditLog] No audit log ID returned from insert");
      }
    })
    .catch((err: unknown) => {
      console.error("[AuditLog] Failed to write audit log entry:", err);
    });
}

async function queueWebhookDispatch(params: {
  organizationId: string;
  auditLogId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  projectId: string | null;
  userId: string;
  metadata: Record<string, unknown> | null;
  timestamp: string;
}): Promise<void> {
  try {
    const baseUrl = authEnv().CLOUDFLARE_WORKERS_API_URL;
    const url = `${baseUrl}/queue-webhook`;
    console.log("[AuditLog] Dispatching webhook to:", url);
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(params),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authEnv().CLOUDFLARE_WORKERS_ADMIN_KEY}`,
      },
    });

    const responseText = await response.text();
    if (response.ok) {
      console.log("[AuditLog] Webhook queued successfully:", responseText);
    } else {
      console.error(
        "[AuditLog] Error queuing webhook dispatch:",
        response.status,
        responseText
      );
    }
  } catch (err) {
    console.error("[AuditLog] Failed to queue webhook dispatch:", err);
  }
}
