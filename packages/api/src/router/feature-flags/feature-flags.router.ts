import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./feature-flags.schemas";
import * as services from "./feature-flags.services";

export const featureFlagsRouter = {
  getAll: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getFeatureFlagsByProjectAndOrganizationInput)
    .query((opts) => {
      return services.getAllFeatureFlagsByProjectAndOrganization({ ...opts });
    }),
} satisfies TRPCRouterRecord;
