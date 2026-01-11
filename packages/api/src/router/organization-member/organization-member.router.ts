import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";
import * as schemas from "./organization-member.schemas";
import * as services from "./organization-member.services";

export const organizationMemberRouter = {
  create: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.createOrganizationMemberSchema)
    .mutation((opts) => {
      return services.createOrganizationMember({ ...opts });
    }),

  getMembers: protectedOrganizationProcedure()
    .input(schemas.getOrganizationMembersSchema)
    .query((opts) => {
      return services.getOrganizationMembers({ ...opts });
    }),

  delete: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.removeOrganizationMemberSchema)
    .mutation((opts) => {
      return services.removeOrganizationMember({ ...opts });
    }),

  updateMemberRole: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.updateMemberRoleSchema)
    .mutation((opts) => {
      return services.updateMemberRole({ ...opts });
    }),
} satisfies TRPCRouterRecord;
