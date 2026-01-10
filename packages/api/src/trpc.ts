import type { Auth } from "@gradual/auth";
import { and, eq } from "@gradual/db";
import { db } from "@gradual/db/client";
import { organization, organizationMember } from "@gradual/db/schema";
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
export const protectedOrganizationProcedure = (
  roles: OrganizationRole[] = []
) => {
  return protectedProcedure.use(async ({ ctx, input, next }) => {
    const organizationId = (input as { organizationId?: string })
      ?.organizationId;

    if (!organizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "organizationId is required",
      });
    }

    const org = await ctx.db
      .select()
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1)
      .then((results) => results[0]);

    if (!org) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Organization not found",
      });
    }

    const member = await ctx.db
      .select()
      .from(organizationMember)
      .where(
        and(
          eq(organizationMember.organizationId, organizationId),
          eq(organizationMember.userId, ctx.session.user.id)
        )
      )
      .limit(1)
      .then((results) => results[0]);

    if (!member) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this organization",
      });
    }

    if (roles.length > 0 && !roles.includes(member.role as OrganizationRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You must have one of the following roles: ${roles.join(", ")}. Your current role is: ${member.role}`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        organization: org,
        organizationMember: member,
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

export type OrganizationProtectedTRPCContext = ProtectedTRPCContext & {
  organization: InferSelectModel<typeof organization>;
  organizationMember: InferSelectModel<typeof organizationMember>;
};
