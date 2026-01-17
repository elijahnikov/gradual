import type { TRPCRouterRecord } from "@trpc/server";

import { protectedOrganizationProcedure, protectedProcedure } from "../../trpc";
import * as schemas from "./organization.schemas";
import * as services from "./organization.services";

export const organizationRouter = {
  create: protectedProcedure
    .input(schemas.createOrganizationSchema)
    .mutation((opts) => {
      return services.createOrganization({ ...opts });
    }),

  getById: protectedOrganizationProcedure({ organization: ["read"] })
    .input(schemas.getOrgnizationByIdSchema)
    .query(({ ctx }) => {
      return services.getOrganizationById({ ctx });
    }),

  getBySlug: protectedOrganizationProcedure({ organization: ["read"] })
    .input(schemas.getOrganizationBySlugSchema)
    .query((opts) => {
      return services.getOrganizationBySlug({ ...opts });
    }),

  update: protectedOrganizationProcedure({ organization: ["update"] })
    .input(schemas.updateOrganizationSchema)
    .mutation((opts) => {
      return services.updateOrganization({ ...opts });
    }),

  delete: protectedOrganizationProcedure({ organization: ["delete"] })
    .input(schemas.deleteOrganizationSchema)
    .mutation((opts) => {
      return services.deleteOrganization({ ...opts });
    }),

  getAllByUserId: protectedProcedure.query(({ ctx }) => {
    return services.getAllOrganizationsByUserId({ ctx });
  }),

  checkSlugAvailability: protectedProcedure
    .input(schemas.checkSlugAvailabilitySchema)
    .query((opts) => {
      return services.checkSlugAvailability({ ...opts });
    }),
} satisfies TRPCRouterRecord;
