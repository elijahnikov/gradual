import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";
import * as schemas from "./invitation.schemas";

export const invitationRouter = {
  create: protectedOrganizationProcedure({ members: ["invite"] })
    .input(schemas.createInvitationSchema)
    .mutation(async ({ ctx, input }) => {
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
