import { authEnv } from "@gradual/auth/env";
import { polarClient } from "@gradual/auth/polar";
import { and, eq, inArray, sql } from "@gradual/db";
import {
  attribute,
  context,
  featureFlag,
  featureFlagEvaluation,
  featureFlagVariation,
  member,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";

import type { PublicTRPCContext } from "../../trpc";
import { ee } from "./evaluations.emitter";
import type { IngestEvaluationsInput } from "./evaluations.schemas";

export async function ingestEvaluations({
  ctx,
  input,
}: {
  ctx: PublicTRPCContext;
  input: IngestEvaluationsInput;
}): Promise<{ ingested: number }> {
  const expectedSecret = authEnv().CLOUDFLARE_WORKERS_ADMIN_KEY;
  if (!expectedSecret || input.workerSecret !== expectedSecret) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid worker secret",
    });
  }

  let totalIngested = 0;

  for (const batch of input.batches) {
    const { meta, events } = batch;
    if (events.length === 0) {
      continue;
    }

    const uniqueFlagKeys = [...new Set(events.map((e) => e.key))];
    const flags = await ctx.db
      .select({ id: featureFlag.id, key: featureFlag.key })
      .from(featureFlag)
      .where(
        and(
          inArray(featureFlag.key, uniqueFlagKeys),
          eq(featureFlag.projectId, meta.projectId),
          eq(featureFlag.organizationId, meta.organizationId)
        )
      );

    const flagKeyToId = new Map(flags.map((f) => [f.key, f.id]));
    const flagIds = flags.map((f) => f.id);

    if (flagIds.length === 0) {
      continue;
    }

    const variations = await ctx.db
      .select({
        id: featureFlagVariation.id,
        name: featureFlagVariation.name,
        featureFlagId: featureFlagVariation.featureFlagId,
      })
      .from(featureFlagVariation)
      .where(inArray(featureFlagVariation.featureFlagId, flagIds));

    const variationLookup = new Map(
      variations.map((v) => [`${v.featureFlagId}:${v.name}`, v.id])
    );

    const evaluationValues: Array<{
      featureFlagId: string;
      environmentId: string;
      variationId: string | null;
      context: null;
      ipAddress: null;
      userAgent: string | null;
      value: unknown;
      reasons: unknown[];
      evaluatedAt: Date | null;
      ruleId: string | null;
      sdkKey: string;
      sdkVersion: string;
      matchedTargetName: string | null;
      flagConfigVersion: number | null;
      sdkPlatform: string | null;
      errorDetail: string | null;
      evaluationDurationUs: number | null;
      isAnonymous: boolean | null;
      inputsUsed: string[] | null;
      traceId: string | null;
      schemaVersion: number | null;
      policyVersion: number | null;
      projectId: string;
      createdAt: Date;
    }> = [];

    for (const event of events) {
      const flagId = flagKeyToId.get(event.key);
      if (!flagId) {
        continue;
      }

      const variationId = event.variationKey
        ? (variationLookup.get(`${flagId}:${event.variationKey}`) ?? null)
        : null;

      evaluationValues.push({
        featureFlagId: flagId,
        environmentId: meta.environmentId,
        variationId,
        context: null,
        ipAddress: null,
        userAgent: meta.userAgent ?? null,
        value: event.value as Record<string, unknown>,
        reasons: event.reasons,
        evaluatedAt: event.evaluatedAt ? new Date(event.evaluatedAt) : null,
        ruleId: event.ruleId ?? null,
        sdkKey: meta.sdkKey,
        sdkVersion: meta.sdkVersion,
        matchedTargetName: event.matchedTargetName ?? null,
        flagConfigVersion: event.flagVersion ?? null,
        sdkPlatform: meta.sdkPlatform ?? null,
        errorDetail: event.errorDetail ?? null,
        evaluationDurationUs: event.evaluationDurationUs ?? null,
        isAnonymous: event.isAnonymous ?? null,
        inputsUsed: event.inputsUsed ?? null,
        traceId: event.traceId ?? null,
        schemaVersion: event.schemaVersion ?? null,
        policyVersion: event.policyVersion ?? null,
        projectId: meta.projectId,
        createdAt: new Date(event.timestamp),
      });
    }

    if (evaluationValues.length > 0) {
      const inserted = await ctx.db
        .insert(featureFlagEvaluation)
        .values(evaluationValues)
        .returning({
          id: featureFlagEvaluation.id,
          featureFlagId: featureFlagEvaluation.featureFlagId,
          environmentId: featureFlagEvaluation.environmentId,
          variationId: featureFlagEvaluation.variationId,
          value: featureFlagEvaluation.value,
          reasons: featureFlagEvaluation.reasons,
          evaluatedAt: featureFlagEvaluation.evaluatedAt,
          ruleId: featureFlagEvaluation.ruleId,
          sdkVersion: featureFlagEvaluation.sdkVersion,
          userAgent: featureFlagEvaluation.userAgent,
          createdAt: featureFlagEvaluation.createdAt,
          matchedTargetName: featureFlagEvaluation.matchedTargetName,
          flagConfigVersion: featureFlagEvaluation.flagConfigVersion,
          sdkPlatform: featureFlagEvaluation.sdkPlatform,
          errorDetail: featureFlagEvaluation.errorDetail,
          evaluationDurationUs: featureFlagEvaluation.evaluationDurationUs,
          isAnonymous: featureFlagEvaluation.isAnonymous,
          inputsUsed: featureFlagEvaluation.inputsUsed,
          traceId: featureFlagEvaluation.traceId,
          schemaVersion: featureFlagEvaluation.schemaVersion,
          policyVersion: featureFlagEvaluation.policyVersion,
        });

      for (const row of inserted) {
        ee.emit("add", {
          ...row,
          reasons: row.reasons ?? null,
          evaluatedAt: row.evaluatedAt ?? null,
          ruleId: row.ruleId ?? null,
          sdkVersion: row.sdkVersion ?? "",
          createdAt: row.createdAt ?? new Date(),
        });
      }

      totalIngested += inserted.length;
    }

    const identityEvents = events
      .filter((e) => e.contextIdentityHash)
      .map((e) => ({
        name: "mau",
        // biome-ignore lint/style/noNonNullAssertion: filtered above
        identityHash: e.contextIdentityHash!,
        organizationId: meta.organizationId,
      }));
    if (identityEvents.length > 0) {
      reportMAUToPolar(ctx, meta.organizationId, identityEvents).catch(() => {
        //no op
      });
    }

    const allContextKinds = new Set<string>();
    const allAttributeKeys = new Map<string, Set<string>>();

    for (const event of events) {
      for (const kind of event.contextKinds) {
        allContextKinds.add(kind);
        if (event.contextKeys[kind]) {
          if (!allAttributeKeys.has(kind)) {
            allAttributeKeys.set(kind, new Set());
          }
          const kindAttrs = allAttributeKeys.get(kind);
          if (kindAttrs) {
            for (const key of event.contextKeys[kind]) {
              kindAttrs.add(key);
            }
          }
        }
      }
    }

    if (allContextKinds.size === 0) {
      continue;
    }

    const contextValues = [...allContextKinds].map((kind) => ({
      kind,
      name: kind,
      projectId: meta.projectId,
      organizationId: meta.organizationId,
    }));

    await ctx.db
      .insert(context)
      .values(contextValues)
      .onConflictDoNothing({
        target: [context.projectId, context.kind],
      });

    const projectContexts = await ctx.db
      .select({ id: context.id, kind: context.kind })
      .from(context)
      .where(eq(context.projectId, meta.projectId));

    const contextKindToId = new Map(projectContexts.map((c) => [c.kind, c.id]));

    const existingAttributes = await ctx.db
      .select({
        id: attribute.id,
        key: attribute.key,
        contextId: attribute.contextId,
      })
      .from(attribute)
      .where(eq(attribute.projectId, meta.projectId));

    const existingAttrKeys = new Set(existingAttributes.map((a) => a.key));
    const now = new Date();

    const newAttributeValues: Array<{
      key: string;
      displayName: string;
      type: string;
      isManual: boolean;
      contextId: string | null;
      projectId: string;
      organizationId: string;
      usageCount: number;
      firstSeenAt: Date;
      lastSeenAt: Date;
    }> = [];

    const attributeIdsToUpdate: string[] = [];

    for (const [kind, keys] of allAttributeKeys) {
      const contextId = contextKindToId.get(kind) ?? null;

      for (const key of keys) {
        if (existingAttrKeys.has(key)) {
          const existing = existingAttributes.find((a) => a.key === key);
          if (existing) {
            attributeIdsToUpdate.push(existing.id);
          }
        } else {
          newAttributeValues.push({
            key,
            displayName: key,
            type: "string",
            isManual: false,
            contextId,
            projectId: meta.projectId,
            organizationId: meta.organizationId,
            usageCount: 1,
            firstSeenAt: now,
            lastSeenAt: now,
          });
          existingAttrKeys.add(key);
        }
      }
    }

    if (newAttributeValues.length > 0) {
      await ctx.db.insert(attribute).values(newAttributeValues);
    }

    if (attributeIdsToUpdate.length > 0) {
      await ctx.db
        .update(attribute)
        .set({
          usageCount: sql`${attribute.usageCount} + 1`,
          lastSeenAt: now,
        })
        .where(inArray(attribute.id, attributeIdsToUpdate));
    }
  }

  return { ingested: totalIngested };
}

const PLAN_MAU_LIMITS: Record<string, number | null> = {
  "89d57bae-1a06-45bf-9f6a-bf437862e775": 1000, // Free
  "9dabe3e7-ef5c-48ba-a1fa-c0446ff99864": 25_000, // Pro
  "702b22c1-f1f7-4aa8-828b-56e322f9a7c2": null, // Enterprise
};

const orgOwnerCache = new Map<string, string>();

const MAU_STATUS_TTL_MS = 5 * 60 * 1000; // 5 minutes
const orgMauStatusCache = new Map<
  string,
  { mauLimit: number | null; limitReached: boolean; cachedAt: number }
>();

async function reportMAUToPolar(
  ctx: { db: PublicTRPCContext["db"] },
  organizationId: string,
  identityEvents: Array<{
    name: string;
    identityHash: string;
    organizationId: string;
  }>
): Promise<void> {
  let ownerUserId = orgOwnerCache.get(organizationId);

  if (!ownerUserId) {
    const [owner] = await ctx.db
      .select({ userId: member.userId })
      .from(member)
      .where(
        and(eq(member.organizationId, organizationId), eq(member.role, "owner"))
      )
      .limit(1);

    if (!owner) {
      return;
    }
    ownerUserId = owner.userId;
    orgOwnerCache.set(organizationId, ownerUserId);
  }

  const cached = orgMauStatusCache.get(organizationId);
  let mauStatus =
    cached && Date.now() - cached.cachedAt < MAU_STATUS_TTL_MS
      ? cached
      : undefined;

  if (!mauStatus) {
    try {
      const state = await polarClient.customers.getStateExternal({
        externalId: ownerUserId,
      });
      const productId = state.activeSubscriptions[0]?.productId;
      const mauLimit =
        productId && productId in PLAN_MAU_LIMITS
          ? (PLAN_MAU_LIMITS[productId] ?? null)
          : 1000;
      const consumedUnits = state.activeMeters[0]?.consumedUnits ?? 0;
      mauStatus = {
        mauLimit,
        limitReached: mauLimit !== null && consumedUnits >= mauLimit,
        cachedAt: Date.now(),
      };
    } catch {
      mauStatus = { mauLimit: 1000, limitReached: false, cachedAt: Date.now() };
    }
    orgMauStatusCache.set(organizationId, mauStatus);
  }

  if (mauStatus.limitReached) {
    propagateMauStatusToWorker(organizationId, true).catch(() => {
      // Fire-and-forget — don't block ingestion
    });
    return;
  }

  const events = identityEvents.map((e) => ({
    name: "mau",
    externalCustomerId: ownerUserId,
    metadata: {
      identity_hash: e.identityHash,
      organization_id: e.organizationId,
    },
  }));

  await polarClient.events.ingest({ events });
}

async function propagateMauStatusToWorker(
  orgId: string,
  mauLimitReached: boolean
): Promise<void> {
  const url = `${authEnv().CLOUDFLARE_WORKERS_API_URL}/api/v1/update-mau-status`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authEnv().CLOUDFLARE_WORKERS_ADMIN_KEY}`,
    },
    body: JSON.stringify({ orgId, mauLimitReached }),
  });
}
