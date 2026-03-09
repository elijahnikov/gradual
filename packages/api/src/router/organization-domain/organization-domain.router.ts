import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure, protectedProcedure } from "../../trpc";
import * as schemas from "./organization-domain.schemas";
import * as services from "./organization-domain.services";

export const organizationDomainRouter = {
  list: protectedOrganizationProcedure({ organization: ["read"] })
    .input(schemas.listDomainsSchema)
    .query(({ ctx, input }) => services.listDomains({ ctx, input })),

  remove: protectedOrganizationProcedure({ organization: ["update"] })
    .input(schemas.removeDomainSchema)
    .mutation(({ ctx, input }) => services.removeDomain({ ctx, input })),

  getOrgsByDomain: protectedProcedure
    .input(schemas.getOrgsByDomainSchema)
    .query(({ ctx }) => services.getOrgsByDomain({ ctx })),

  joinByDomain: protectedProcedure
    .input(schemas.joinByDomainSchema)
    .mutation(({ ctx, input }) => services.joinByDomain({ ctx, input })),
} satisfies TRPCRouterRecord;
