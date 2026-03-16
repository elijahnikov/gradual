import { count, eq } from "@gradual/db";
import { invitation, member } from "@gradual/db/schema";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and } from "drizzle-orm";
import { getOrganizationPlanLimits } from "../../lib/plan-limits";
import { protectedOrganizationProcedure } from "../../trpc";
import * as schemas from "./invitation.schemas";

export const invitationRouter = {
  create: protectedOrganizationProcedure({ members: ["invite"] })
    .input(schemas.createInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const [planLimits, memberCount, pendingCount] = await Promise.all([
        getOrganizationPlanLimits(ctx, ctx.organization.id),
        ctx.db
          .select({ total: count() })
          .from(member)
          .where(eq(member.organizationId, ctx.organization.id)),
        ctx.db
          .select({ total: count() })
          .from(invitation)
          .where(
            and(
              eq(invitation.organizationId, ctx.organization.id),
              eq(invitation.status, "pending")
            )
          ),
      ]);

      const totalSeats =
        (memberCount[0]?.total ?? 0) + (pendingCount[0]?.total ?? 0);
      if (planLimits.members !== null && totalSeats >= planLimits.members) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You've reached the team member limit for your plan. Upgrade to invite more members.",
        });
      }

      const result = await ctx.authApi.createInvitation({
        body: {
          email: input.email,
          role: input.role,
          organizationId: ctx.organization.id,
        },
        headers: ctx.headers,
      });

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create invitation",
        });
      }

      return result;
    }),

  list: protectedOrganizationProcedure({ members: ["read"] })
    .input(schemas.listInvitationsSchema)
    .query(async ({ ctx }) => {
      const result = await ctx.authApi.listInvitations({
        query: {
          organizationId: ctx.organization.id,
        },
        headers: ctx.headers,
      });

      return result ?? [];
    }),

  cancel: protectedOrganizationProcedure({ members: ["invite"] })
    .input(schemas.cancelInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.authApi.cancelInvitation({
        body: {
          invitationId: input.invitationId,
        },
        headers: ctx.headers,
      });

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to cancel invitation",
        });
      }

      return result;
    }),
} satisfies TRPCRouterRecord;
