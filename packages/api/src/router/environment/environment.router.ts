import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./environment.schemas";
import * as services from "./environment.services";

export const environmentRouter = {
  create: protectedOrganizationProcedure({ environments: ["create"] })
    .input(schemas.createEnvironmentSchema)
    .mutation((opts) => services.createEnvironment({ ...opts })),

  list: protectedOrganizationProcedure({ environments: ["read"] })
    .input(schemas.listEnvironmentsSchema)
    .query((opts) => services.listEnvironments({ ...opts })),

  get: protectedOrganizationProcedure({ environments: ["read"] })
    .input(schemas.getEnvironmentSchema)
    .query((opts) => services.getEnvironment({ ...opts })),

  getBySlug: protectedOrganizationProcedure({ environments: ["read"] })
    .input(schemas.getEnvironmentBySlugSchema)
    .query((opts) => services.getEnvironmentBySlug({ ...opts })),

  update: protectedOrganizationProcedure({ environments: ["update"] })
    .input(schemas.updateEnvironmentSchema)
    .mutation((opts) => services.updateEnvironment({ ...opts })),

  delete: protectedOrganizationProcedure({ environments: ["delete"] })
    .input(schemas.deleteEnvironmentSchema)
    .mutation((opts) => services.deleteEnvironment({ ...opts })),
} satisfies TRPCRouterRecord;
