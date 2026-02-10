import { authEnv } from "@gradual/auth/env";
import { and, eq, inArray, sql } from "@gradual/db";
import {
  attribute,
  context,
  featureFlag,
  featureFlagEvaluation,
  featureFlagVariation,
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

    // 1. Resolve flag keys to UUIDs
    const uniqueFlagKeys = [...new Set(events.map((e) => e.flagKey))];
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

    // 2. Resolve variation names to UUIDs
    const variations = await ctx.db
      .select({
        id: featureFlagVariation.id,
        name: featureFlagVariation.name,
        featureFlagId: featureFlagVariation.featureFlagId,
      })
      .from(featureFlagVariation)
      .where(inArray(featureFlagVariation.featureFlagId, flagIds));

    // Map "flagId:variationName" -> variationId
    const variationLookup = new Map(
      variations.map((v) => [`${v.featureFlagId}:${v.name}`, v.id])
    );

    // 3. Build evaluation records
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
      createdAt: Date;
    }> = [];

    for (const event of events) {
      const flagId = flagKeyToId.get(event.flagKey);
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
        flagConfigVersion: event.flagConfigVersion ?? null,
        sdkPlatform: meta.sdkPlatform ?? null,
        errorDetail: event.errorDetail ?? null,
        evaluationDurationUs: event.evaluationDurationUs ?? null,
        isAnonymous: event.isAnonymous ?? null,
        createdAt: new Date(event.timestamp),
      });
    }

    // 4. Bulk insert evaluations
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

    // 5. Context and attribute discovery
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

    // 5a. Upsert context kinds
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

    // 5b. Fetch all contexts for this project to get contextId mapping
    const projectContexts = await ctx.db
      .select({ id: context.id, kind: context.kind })
      .from(context)
      .where(eq(context.projectId, meta.projectId));

    const contextKindToId = new Map(projectContexts.map((c) => [c.kind, c.id]));

    // 5c. Discover new attributes
    // Fetch existing attributes for this project
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
          // Mark for usage count update
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

    // Insert new attributes
    if (newAttributeValues.length > 0) {
      await ctx.db.insert(attribute).values(newAttributeValues);
    }

    // Update usage counts for existing attributes
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
