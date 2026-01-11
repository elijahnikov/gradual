import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./environment.schemas";
import * as services from "./environment.services";

export const environmentRouter = {
  create: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.createEnvironmentSchema)
    .mutation((opts) => services.createEnvironment({ ...opts })),

  list: protectedOrganizationProcedure()
    .input(schemas.listEnvironmentsSchema)
    .query((opts) => services.listEnvironments({ ...opts })),

  get: protectedOrganizationProcedure()
    .input(schemas.getEnvironmentSchema)
    .query((opts) => services.getEnvironment({ ...opts })),

  getBySlug: protectedOrganizationProcedure()
    .input(schemas.getEnvironmentBySlugSchema)
    .query((opts) => services.getEnvironmentBySlug({ ...opts })),

  update: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.updateEnvironmentSchema)
    .mutation((opts) => services.updateEnvironment({ ...opts })),

  delete: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.deleteEnvironmentSchema)
    .mutation((opts) => services.deleteEnvironment({ ...opts })),
} satisfies TRPCRouterRecord;
