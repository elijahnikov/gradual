import { authEnv } from "@gradual/auth/env";
import { eq } from "@gradual/db";
import { apiKey } from "@gradual/db/schema";
import { TRPCError } from "@trpc/server";
import type { ProtectedOrganizationTRPCContext } from "../../trpc";
import type {
  CreateApiKeyInput,
  GetApiKeyByOrganizationIdAndProjectIdInput,
  ListApiKeysByOrganizationIdAndProjectIdInput,
  RevokeApiKeyInput,
} from "./api-key.schemas";
import { extractKeyPrefix, generateApiKey, hashApiKey } from "./api-key.utils";

export const createApiKey = async ({
  input,
  ctx,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: CreateApiKeyInput;
}) => {
  const currentUser = ctx.session.user;
  const { projectId } = input;

  const foundProject = await ctx.db.query.project.findFirst({
    where: ({ id, organizationId, deletedAt }, { eq, isNull, and }) =>
      and(
        eq(id, projectId),
        eq(organizationId, ctx.organization.id),
        isNull(deletedAt)
      ),
  });

  if (!foundProject) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
  }

  const key = generateApiKey();
  const keyHash = hashApiKey(key);
  const keyPrefix = extractKeyPrefix(key);

  const [createdApiKey] = await ctx.db
    .insert(apiKey)
    .values({
      ...input,
      organizationId: ctx.organization.id,
      createdById: currentUser.id,
      key,
      keyHash,
      keyPrefix,
      projectId: input.projectId,
    })
    .returning();

  if (!createdApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to create API key",
    });
  }

  try {
    await fetch(`${authEnv().CLOUDFLARE_WORKERS_API_URL}/submit-api-key`, {
      method: "POST",
      body: JSON.stringify({
        apiKey: createdApiKey.key,
        projectId: createdApiKey.projectId,
        orgId: createdApiKey.organizationId,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authEnv().CLOUDFLARE_WORKERS_ADMIN_KEY}`,
      },
    });
  } catch (err) {
    console.error("Error submitting API key to Cloudflare Worker:", err);
  }

  return {
    ...createdApiKey,
    key,
  };
};

export const getApiKeyByOrganizationIdAndProjectId = async ({
  input,
  ctx,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: GetApiKeyByOrganizationIdAndProjectIdInput;
}) => {
  const apiKey = await ctx.db.query.apiKey.findFirst({
    where: ({ organizationId, projectId, revokedAt }, { eq, and, isNull }) =>
      and(
        eq(organizationId, input.organizationId),
        eq(projectId, input.projectId),
        isNull(revokedAt)
      ),
    columns: {
      id: true,
      keyPrefix: true,
      createdAt: true,
      key: true,
    },
    with: {
      createdBy: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });
  if (!apiKey) {
    throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
  }
  return apiKey;
};

export const revokeApiKey = async ({
  input,
  ctx,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: RevokeApiKeyInput;
}) => {
  const apiKeyToRevoke = await ctx.db.query.apiKey.findFirst({
    where: (
      { id, organizationId, projectId, revokedAt },
      { eq, and, isNull }
    ) =>
      and(
        eq(id, input.id),
        eq(organizationId, input.organizationId),
        eq(projectId, input.projectId),
        isNull(revokedAt)
      ),
  });
  if (!apiKeyToRevoke) {
    throw new TRPCError({ code: "NOT_FOUND", message: "API key not found" });
  }
  const [revokedApiKey] = await ctx.db
    .update(apiKey)
    .set({
      revokedAt: new Date(),
    })
    .where(eq(apiKey.id, apiKeyToRevoke.id))
    .returning();

  if (!revokedApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to revoke API key",
    });
  }
  return revokedApiKey;
};

export const listApiKeysByOrganizationIdAndProjectId = async ({
  input,
  ctx,
}: {
  ctx: ProtectedOrganizationTRPCContext;
  input: ListApiKeysByOrganizationIdAndProjectIdInput;
}) => {
  const apiKeys = await ctx.db.query.apiKey.findMany({
    where: ({ organizationId, projectId, revokedAt }, { eq, and, isNull }) =>
      and(
        eq(organizationId, input.organizationId),
        eq(projectId, input.projectId),
        isNull(revokedAt)
      ),
    columns: {
      id: true,
      keyPrefix: true,
      createdAt: true,
      name: true,
      revokedAt: true,
    },
    with: {
      createdBy: {
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: (apiKey, { desc }) => [desc(apiKey.createdAt)],
    limit: input.limit ?? 10,
    offset: (input.page ?? 1) * (input.limit ?? 10),
  });
  return apiKeys;
};
