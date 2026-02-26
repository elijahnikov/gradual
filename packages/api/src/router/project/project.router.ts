import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./project.schemas";
import * as services from "./project.services";

export const projectRouter = {
  create: protectedOrganizationProcedure({ project: ["create"] })
    .input(schemas.createProjectSchema)
    .mutation((opts) => {
      return services.createProject({ ...opts });
    }),

  getById: protectedOrganizationProcedure({ project: ["read"] })
    .input(schemas.getProjectByIdSchema)
    .query((opts) => {
      return services.getProjectById({ ...opts });
    }),

  getBySlug: protectedOrganizationProcedure({ project: ["read"] })
    .input(schemas.getProjectBySlugSchema)
    .query((opts) => {
      return services.getProjectBySlug({ ...opts });
    }),

  update: protectedOrganizationProcedure({ project: ["update"] })
    .input(schemas.updateProjectSchema)
    .mutation((opts) => {
      return services.updateProject({ ...opts });
    }),

  delete: protectedOrganizationProcedure({ project: ["delete"] })
    .input(schemas.deleteProjectSchema)
    .mutation((opts) => {
      return services.deleteProject({ ...opts });
    }),

  getAllByOrganizationId: protectedOrganizationProcedure({ project: ["read"] })
    .input(schemas.getAllProjectsByOrganizationIdSchema)
    .query((opts) => {
      return services.getAllProjectsByOrganizationId({ ...opts });
    }),

  getBreadcrumbs: protectedOrganizationProcedure({ project: ["read"] })
    .input(schemas.getBreadcrumbsSchema)
    .query((opts) => {
      return services.getBreadcrumbs({ ...opts });
    }),

  getHomeSummary: protectedOrganizationProcedure({ project: ["read"] })
    .input(schemas.getHomeSummarySchema)
    .query((opts) => {
      return services.getHomeSummary({ ...opts });
    }),

  watchEvaluations: protectedOrganizationProcedure({ project: ["read"] })
    .input(schemas.watchProjectEvaluationsSchema)
    .subscription((opts) => services.watchProjectEvaluations({ ...opts })),

  /** Temporary: emit fake evaluation events for testing realtime */
  seedLiveEvaluation: protectedOrganizationProcedure({ project: ["read"] })
    .input(schemas.seedLiveEvaluationSchema)
    .mutation((opts) => services.seedLiveEvaluation({ ...opts })),
} satisfies TRPCRouterRecord;
