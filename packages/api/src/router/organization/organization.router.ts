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

  getById: protectedOrganizationProcedure()
    .input(schemas.getOrgnizationByIdSchema)
    .query(({ ctx }) => {
      return services.getOrganizationById({ ctx });
    }),

  getBySlug: protectedProcedure
    .input(schemas.getOrganizationBySlugSchema)
    .query((opts) => {
      return services.getOrganizationBySlug({ ...opts });
    }),

  update: protectedOrganizationProcedure(["admin", "owner"])
    .input(schemas.updateOrganizationSchema)
    .mutation((opts) => {
      return services.updateOrganization({ ...opts });
    }),

  delete: protectedOrganizationProcedure(["owner"])
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
