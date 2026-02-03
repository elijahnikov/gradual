import { authEnv } from "@gradual/auth/env";
import { eq } from "@gradual/db";
import {
  featureFlagEnvironment,
  type featureFlagIndividualTarget,
  type featureFlagSegmentTarget,
  type featureFlagTarget,
  type featureFlagTargetingRule,
  featureFlagVariation,
  type segment,
} from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";

import type {
  ProtectedOrganizationTRPCContext,
  PublicTRPCContext,
} from "../../trpc";
import type {
  BuildForWorkerInput,
  GenerateSnapshotInput,
  PublishAllSnapshotsInput,
  PublishSnapshotInput,
} from "./snapshots.schemas";
import type {
  EnvironmentSnapshot,
  SnapshotFlag,
  SnapshotSegment,
  SnapshotTarget,
  SnapshotVariation,
  TargetingOperator,
} from "./snapshots.types";

export async function buildEnvironmentSnapshot({
  ctx,
  orgId,
  projectId,
  environmentSlug,
}: {
  ctx:
    | { db: ProtectedOrganizationTRPCContext["db"] }
    | { db: PublicTRPCContext["db"] };
  orgId: string;
  projectId: string;
  environmentSlug: string;
}): Promise<EnvironmentSnapshot> {
  const foundEnvironment = await ctx.db.query.environment.findFirst({
    where: (
      { slug, projectId: envProjectId, organizationId, deletedAt },
      { eq, and, isNull }
    ) =>
      and(
        eq(slug, environmentSlug),
        eq(envProjectId, projectId),
        eq(organizationId, orgId),
        isNull(deletedAt)
      ),
  });

  if (!foundEnvironment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Environment '${environmentSlug}' not found`,
    });
  }

  const flags = await ctx.db.query.featureFlag.findMany({
    where: (
      { projectId: flagProjectId, organizationId, archivedAt },
      { eq, and, isNull }
    ) =>
      and(
        eq(flagProjectId, projectId),
        eq(organizationId, orgId),
        isNull(archivedAt)
      ),
    with: {
      variations: {
        orderBy: (v, { asc }) => asc(v.sortOrder),
      },
    },
  });

  const flagEnvironmentConfigs = await ctx.db
    .select({
      flagEnv: featureFlagEnvironment,
      defaultVariation: featureFlagVariation,
    })
    .from(featureFlagEnvironment)
    .leftJoin(
      featureFlagVariation,
      eq(featureFlagEnvironment.defaultVariationId, featureFlagVariation.id)
    )
    .where(eq(featureFlagEnvironment.environmentId, foundEnvironment.id));

  const flagEnvMap = new Map(
    flagEnvironmentConfigs.map((config) => [
      config.flagEnv.featureFlagId,
      config,
    ])
  );

  const flagEnvIds = flagEnvironmentConfigs.map((c) => c.flagEnv.id);

  let allTargets: Array<{
    target: typeof featureFlagTarget.$inferSelect;
    variation: typeof featureFlagVariation.$inferSelect | null;
    rules: (typeof featureFlagTargetingRule.$inferSelect)[];
    individual: typeof featureFlagIndividualTarget.$inferSelect | null;
    segmentTarget: typeof featureFlagSegmentTarget.$inferSelect | null;
    segment: typeof segment.$inferSelect | null;
  }> = [];

  if (flagEnvIds.length > 0) {
    const targetsRaw = await ctx.db.query.featureFlagTarget.findMany({
      where: (t, { inArray }) =>
        inArray(t.featureFlagEnvironmentId, flagEnvIds),
      orderBy: (t, { asc }) => asc(t.sortOrder),
      with: {
        variation: true,
        rules: {
          orderBy: (r, { asc }) => asc(r.sortOrder),
        },
        individual: true,
        segment: {
          with: {
            segment: true,
          },
        },
      },
    });

    allTargets = targetsRaw.map((t) => ({
      target: t,
      variation: t.variation,
      rules: t.rules,
      individual: t.individual,
      segmentTarget: t.segment,
      segment: t.segment?.segment ?? null,
    }));
  }

  const targetsByFlagEnvId = new Map<string, typeof allTargets>();
  for (const t of allTargets) {
    const key = t.target.featureFlagEnvironmentId;
    if (!targetsByFlagEnvId.has(key)) {
      targetsByFlagEnvId.set(key, []);
    }
    targetsByFlagEnvId.get(key)?.push(t);
  }

  const allSegments = await ctx.db.query.segment.findMany({
    where: (
      { projectId: segProjectId, organizationId, deletedAt },
      { eq, and, isNull }
    ) =>
      and(
        eq(segProjectId, projectId),
        eq(organizationId, orgId),
        isNull(deletedAt)
      ),
  });

  const segments: Record<string, SnapshotSegment> = {};
  for (const seg of allSegments) {
    segments[seg.key] = {
      key: seg.key,
      conditions: (seg.conditions ?? []).map((c) => ({
        attributeKey: c.attribute,
        operator: c.operator as TargetingOperator,
        value: c.value,
      })),
    };
  }

  const snapshotFlags: Record<string, SnapshotFlag> = {};

  for (const flag of flags) {
    const flagEnvConfig = flagEnvMap.get(flag.id);

    const variations: Record<string, SnapshotVariation> = {};
    let defaultVariationKey = "";
    let offVariationKey = "";

    for (const v of flag.variations) {
      variations[v.name] = {
        key: v.name,
        value: v.value,
      };

      if (flagEnvConfig?.flagEnv.defaultVariationId === v.id) {
        defaultVariationKey = v.name;
      }

      if (flagEnvConfig?.flagEnv.offVariationId === v.id) {
        offVariationKey = v.name;
      }

      if (v.isDefault && !defaultVariationKey) {
        defaultVariationKey = v.name;
      }
    }

    if (!defaultVariationKey && flag.variations.length > 0) {
      defaultVariationKey = flag.variations[0]?.name ?? "";
    }
    if (!offVariationKey && flag.variations.length > 0) {
      offVariationKey =
        flag.variations[1]?.name ?? flag.variations[0]?.name ?? "";
    }

    const targets: SnapshotTarget[] = [];
    const flagTargets = flagEnvConfig
      ? (targetsByFlagEnvId.get(flagEnvConfig.flagEnv.id) ?? [])
      : [];

    for (const t of flagTargets) {
      const variationKey = t.variation?.name ?? defaultVariationKey;

      const snapshotTarget: SnapshotTarget = {
        type: t.target.type as "rule" | "individual" | "segment",
        variationKey,
        sortOrder: t.target.sortOrder,
      };

      switch (t.target.type) {
        case "rule":
          snapshotTarget.conditions = t.rules.map((r) => ({
            attributeKey: r.attributeKey,
            operator: r.operator as TargetingOperator,
            value: r.value,
          }));
          break;

        case "individual":
          if (t.individual) {
            snapshotTarget.attributeKey = t.individual.attributeKey;
            snapshotTarget.attributeValue = t.individual.attributeValue;
          }
          break;

        case "segment":
          if (t.segment) {
            snapshotTarget.segmentKey = t.segment.key;
          }
          break;

        default:
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Unknown target type: ${t.target.type}`,
          });
      }

      targets.push(snapshotTarget);
    }

    snapshotFlags[flag.key] = {
      key: flag.key,
      type: flag.type as "boolean" | "string" | "number" | "json",
      enabled: flagEnvConfig?.flagEnv.enabled ?? false,
      variations,
      defaultVariationKey,
      offVariationKey,
      targets,
    };
  }

  const version = Date.now();

  return {
    version,
    generatedAt: new Date().toISOString(),
    meta: {
      projectId,
      organizationId: orgId,
      environmentSlug,
      environmentId: foundEnvironment.id,
    },
    flags: snapshotFlags,
    segments,
  };
}

export async function queueSnapshotPublish({
  orgId,
  projectId,
  environmentSlug,
}: {
  orgId: string;
  projectId: string;
  environmentSlug: string;
}): Promise<{ queued: boolean }> {
  const url = `${authEnv().CLOUDFLARE_WORKERS_API_URL}/queue-snapshot`;
  console.log(
    `[Snapshot] Queuing snapshot for ${orgId}/${projectId}/${environmentSlug}`
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        orgId,
        projectId,
        environmentSlug,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authEnv().CLOUDFLARE_WORKERS_ADMIN_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[Snapshot] Error queuing snapshot:",
        response.status,
        errorText
      );
      return { queued: false };
    }

    return { queued: true };
  } catch (err) {
    console.error("[Snapshot] Error queuing snapshot publish:", err);
    return { queued: false };
  }
}

export async function queueAllSnapshotsPublish({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: PublishAllSnapshotsInput;
}): Promise<{ queued: number }> {
  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, and, isNull }) =>
      and(
        eq(slug, input.projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  const environments = await ctx.db.query.environment.findMany({
    where: ({ projectId, organizationId, deletedAt }, { eq, and, isNull }) =>
      and(
        eq(projectId, foundProject.id),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  let queued = 0;
  for (const env of environments) {
    const result = await queueSnapshotPublish({
      orgId: ctx.organization.id,
      projectId: foundProject.id,
      environmentSlug: env.slug,
    });
    if (result.queued) {
      queued++;
    }
  }

  return { queued };
}

export async function generateSnapshot({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GenerateSnapshotInput;
}): Promise<EnvironmentSnapshot> {
  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, and, isNull }) =>
      and(
        eq(slug, input.projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  return buildEnvironmentSnapshot({
    ctx,
    orgId: ctx.organization.id,
    projectId: foundProject.id,
    environmentSlug: input.environmentSlug,
  });
}

export async function publishSnapshot({
  ctx,
  input,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: PublishSnapshotInput;
}): Promise<{ queued: boolean }> {
  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ slug, organizationId, deletedAt }, { eq, and, isNull }) =>
      and(
        eq(slug, input.projectSlug),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Project not found",
    });
  }

  return queueSnapshotPublish({
    orgId: ctx.organization.id,
    projectId: foundProject.id,
    environmentSlug: input.environmentSlug,
  });
}

export function buildForWorker({
  ctx,
  input,
}: {
  ctx: PublicTRPCContext;
  input: BuildForWorkerInput;
}): Promise<EnvironmentSnapshot> {
  const expectedSecret = authEnv().CLOUDFLARE_WORKERS_ADMIN_KEY;
  if (!expectedSecret || input.workerSecret !== expectedSecret) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid worker secret",
    });
  }

  return buildEnvironmentSnapshot({
    ctx,
    orgId: input.orgId,
    projectId: input.projectId,
    environmentSlug: input.environmentSlug,
  });
}
