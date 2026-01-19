import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./feature-flags.schemas";
import * as services from "./feature-flags.services";

export const featureFlagsRouter = {
  getAll: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getFeatureFlagsByProjectAndOrganizationSchema)
    .query((opts) =>
      services.getAllFeatureFlagsByProjectAndOrganization({ ...opts })
    ),

  getByKey: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getFeatureFlagByKeySchema)
    .query((opts) => services.getFeatureFlagByKey({ ...opts })),

  create: protectedOrganizationProcedure({ flags: ["create"] })
    .input(schemas.createCompleteFeatureFlagSchema)
    .mutation((opts) => services.createCompleteFeatureFlag({ ...opts })),
} satisfies TRPCRouterRecord;
