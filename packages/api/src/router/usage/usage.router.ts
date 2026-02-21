import type { TRPCRouterRecord } from "@trpc/server";
import { protectedProcedure } from "../../trpc";
import * as schemas from "./usage.schemas";
import * as services from "./usage.services";

export const usageRouter = {
  getUsageByOrganizationId: protectedProcedure
    .input(schemas.getUsageByOrganizationIdSchema)
    .query(({ ctx, input }) =>
      services.getUsageByOrganizationId({ ctx, input })
    ),
} satisfies TRPCRouterRecord;
