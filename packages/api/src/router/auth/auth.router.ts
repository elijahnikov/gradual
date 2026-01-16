import type { TRPCRouterRecord } from "@trpc/server";
import { protectedProcedure, publicProcedure } from "../../trpc";
import * as schemas from "./auth.schemas";
import * as services from "./auth.services";

export const authRouter = {
  getSession: publicProcedure.query(({ ctx }) => {
    return ctx.session;
  }),

  getUserOnboardingStatus: protectedProcedure.query(({ ctx }) => {
    return services.getUserOnboardingStatus({ ctx });
  }),

  updateUser: protectedProcedure
    .input(schemas.updateUserSchema)
    .mutation(async ({ ctx, input }) => services.updateUser({ ctx, input })),

  listSubscriptionsByOrganizationId: protectedProcedure
    .input(schemas.listSubscriptionsByOrganizationIdSchema)
    .query(async ({ ctx, input }) =>
      services.listSubscriptionsByOrganizationId({ ctx, input })
    ),
} satisfies TRPCRouterRecord;
