import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./project.schemas";
import * as services from "./project.services";

export const projectRouter = {
  create: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.createProjectSchema)
    .mutation((opts) => {
      return services.createProject({ ...opts });
    }),

  getById: protectedOrganizationProcedure()
    .input(schemas.getProjectByIdSchema)
    .query((opts) => {
      return services.getProjectById({ ...opts });
    }),

  getBySlug: protectedOrganizationProcedure()
    .input(schemas.getProjectBySlugSchema)
    .query((opts) => {
      return services.getProjectBySlug({ ...opts });
    }),

  update: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.updateProjectSchema)
    .mutation((opts) => {
      return services.updateProject({ ...opts });
    }),

  delete: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.deleteProjectSchema)
    .mutation((opts) => {
      return services.deleteProject({ ...opts });
    }),

  getAllByOrganizationId: protectedOrganizationProcedure().query((opts) => {
    return services.getAllProjectsByOrganizationId({ ...opts });
  }),
} satisfies TRPCRouterRecord;
