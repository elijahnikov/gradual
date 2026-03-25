import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./flag-templates.schemas";
import * as services from "./flag-templates.services";

export const flagTemplatesRouter = {
  list: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.listFlagTemplatesSchema)
    .query((opts) => services.listFlagTemplates({ ...opts })),

  get: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getFlagTemplateSchema)
    .query((opts) => services.getFlagTemplate({ ...opts })),

  create: protectedOrganizationProcedure({ flags: ["create"] })
    .input(schemas.createFlagTemplateSchema)
    .mutation((opts) => services.createFlagTemplate({ ...opts })),

  update: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.updateFlagTemplateSchema)
    .mutation((opts) => services.updateFlagTemplate({ ...opts })),

  delete: protectedOrganizationProcedure({ flags: ["delete"] })
    .input(schemas.deleteFlagTemplateSchema)
    .mutation((opts) => services.deleteFlagTemplate({ ...opts })),

  incrementUsage: protectedOrganizationProcedure({ flags: ["create"] })
    .input(schemas.incrementUsageSchema)
    .mutation((opts) => services.incrementUsage({ ...opts })),
} satisfies TRPCRouterRecord;
