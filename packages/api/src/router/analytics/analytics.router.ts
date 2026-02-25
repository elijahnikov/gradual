import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./analytics.schemas";
import * as services from "./analytics.services";

export const analyticsRouter = {
  getOverview: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getOverviewSchema)
    .query((opts) => services.getOverview({ ...opts })),

  getVolumeOverTime: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getVolumeOverTimeSchema)
    .query((opts) => services.getVolumeOverTime({ ...opts })),

  getVariantDistribution: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getVariantDistributionSchema)
    .query((opts) => services.getVariantDistribution({ ...opts })),

  getEnvironmentBreakdown: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getEnvironmentBreakdownSchema)
    .query((opts) => services.getEnvironmentBreakdown({ ...opts })),

  getTopFlags: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getTopFlagsSchema)
    .query((opts) => services.getTopFlags({ ...opts })),

  getSdkPlatformBreakdown: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getSdkPlatformBreakdownSchema)
    .query((opts) => services.getSdkPlatformBreakdown({ ...opts })),

  getErrorRate: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getErrorRateSchema)
    .query((opts) => services.getErrorRate({ ...opts })),

  getLatency: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getLatencySchema)
    .query((opts) => services.getLatency({ ...opts })),
} satisfies TRPCRouterRecord;
