import type { Auth } from "@gradual/auth";
import { and, eq } from "@gradual/db";
import { db } from "@gradual/db/client";
import { member, organization } from "@gradual/db/schema";
import { initTRPC, TRPCError } from "@trpc/server";
import type { InferSelectModel } from "drizzle-orm";
import superjson from "superjson";
import { ZodError, z } from "zod/v4";

export const createTRPCContext = async (opts: {
  headers: Headers;
  auth: Auth;
}) => {
  const authApi = opts.auth.api;
  const session = await authApi.getSession({
    headers: opts.headers,
  });
  return {
    authApi,
    session,
    db,
    headers: opts.headers,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof ZodError
          ? z.flattenError(error.cause as ZodError<Record<string, unknown>>)
          : null,
    },
  }),
  sse: {
    maxDurationMs: 5 * 60 * 1000,
    ping: {
      enabled: true,
      intervalMs: 3000,
    },
    client: {
      reconnectAfterInactivityMs: 5000,
    },
  },
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export type OrganizationRole = "owner" | "admin" | "member" | "viewer";

interface PermissionCheck {
  organization?: ("read" | "update" | "delete")[];
  project?: ("read" | "create" | "update" | "delete")[];
  members?: ("read" | "invite" | "remove" | "update")[];
  flags?: ("read" | "create" | "update" | "delete")[];
  environments?: ("read" | "create" | "update" | "delete")[];
  segments?: ("read" | "create" | "update" | "delete")[];
  apiKeys?: ("read" | "create" | "update" | "delete")[];
}

export const protectedOrganizationProcedure = (
  permissions?: PermissionCheck
) => {
  return protectedProcedure.use(async (opts) => {
    const { ctx, next } = opts;
    const rawInput = await opts.getRawInput();
    const input = rawInput as {
      organizationId?: string;
      organizationSlug?: string;
    };

    let org: InferSelectModel<typeof organization> | undefined;
    let organizationId: string | undefined;

    if (input.organizationId) {
      organizationId = input.organizationId;
      org = await ctx.db
        .select()
        .from(organization)
        .where(and(eq(organization.id, organizationId)))
        .limit(1)
        .then((results) => results[0]);
    } else if (input.organizationSlug) {
      org = await ctx.db
        .select()
        .from(organization)
        .where(and(eq(organization.slug, input.organizationSlug)))
        .limit(1)
        .then((results) => results[0]);

      if (org) {
        organizationId = org.id;
      }
    } else {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "organizationId or organizationSlug is required",
      });
    }

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    if (!organizationId) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to resolve organization ID",
      });
    }

    const memberData = await ctx.db
      .select()
      .from(member)
      .where(
        and(
          eq(member.organizationId, organizationId),
          eq(member.userId, ctx.session.user.id)
        )
      )
      .limit(1)
      .then((results) => results[0]);

    if (!memberData) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organization",
      });
    }

    if (permissions) {
      const permissionResult = await ctx.authApi.hasPermission({
        headers: ctx.headers,
        body: {
          organizationId,
          permissions,
        },
      });

      const hasPermission =
        typeof permissionResult === "object" && "success" in permissionResult
          ? permissionResult.success
          : Boolean(permissionResult);

      if (!hasPermission) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You do not have the required permissions to perform this action",
        });
      }
    }

    return next({
      ctx: {
        ...ctx,
        organization: org,
        organizationMember: memberData,
      },
    });
  });
};

export type ProtectedTRPCContext = Awaited<
  ReturnType<typeof createTRPCContext>
> & {
  session: NonNullable<
    Awaited<ReturnType<typeof createTRPCContext>>["session"]
  >;
};

export type ProtectedOrganizationTRPCContext = ProtectedTRPCContext & {
  organization: InferSelectModel<typeof organization>;
  organizationMember: InferSelectModel<typeof member>;
};

export type PublicTRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
