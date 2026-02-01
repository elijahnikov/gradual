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

  // INTERNAL ONLY
  seedEvaluations: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.seedEvaluationsSchema)
    .mutation((opts) => services.seedEvaluations({ ...opts })),

  getTargetingRules: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getTargetingRulesSchema)
    .query((opts) => services.getTargetingRules({ ...opts })),

  saveTargetingRules: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.saveTargetingRulesSchema)
    .mutation((opts) => services.saveTargetingRules({ ...opts })),

  update: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.updateFeatureFlagSchema)
    .mutation((opts) => services.updateFeatureFlag({ ...opts })),

  getVariations: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getVariationsSchema)
    .query((opts) => services.getVariations({ ...opts })),

  updateVariation: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.updateVariationSchema)
    .mutation((opts) => services.updateVariation({ ...opts })),

  addVariation: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.addVariationSchema)
    .mutation((opts) => services.addVariation({ ...opts })),

  deleteVariation: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.deleteVariationSchema)
    .mutation((opts) => services.deleteVariation({ ...opts })),

  getMetricsEvaluations: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getMetricsEvaluationsSchema)
    .query((opts) => services.getMetricsEvaluations({ ...opts })),
} satisfies TRPCRouterRecord;
