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

  getBreadcrumbInfo: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getFeatureFlagBreadcrumbInfoSchema)
    .query((opts) => services.getFeatureFlagBreadcrumbInfo({ ...opts })),

  create: protectedOrganizationProcedure({ flags: ["create"] })
    .input(schemas.createCompleteFeatureFlagSchema)
    .mutation((opts) => services.createCompleteFeatureFlag({ ...opts })),

  getPreviewEvaluations: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getPreviewEvaluationsSchema)
    .query((opts) => services.getPreviewEvaluations({ ...opts })),

  deleteFlags: protectedOrganizationProcedure({ flags: ["delete"] })
    .input(schemas.deleteFlagsSchema)
    .mutation((opts) => services.deleteFlags({ ...opts })),

  seedEvaluations: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.seedEvaluationsSchema)
    .mutation((opts) => services.seedEvaluations({ ...opts })),

  getTargetingRules: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getTargetingRulesSchema)
    .query((opts) => services.getTargetingRules({ ...opts })),
} satisfies TRPCRouterRecord;
