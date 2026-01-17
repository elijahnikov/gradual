import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";
import * as schemas from "./organization-member.schemas";
import * as services from "./organization-member.services";

export const organizationMemberRouter = {
  create: protectedOrganizationProcedure({ members: ["invite"] })
    .input(schemas.createOrganizationMemberSchema)
    .mutation((opts) => {
      return services.createOrganizationMember({ ...opts });
    }),

  getMembers: protectedOrganizationProcedure({ members: ["read"] })
    .input(schemas.getOrganizationMembersSchema)
    .query((opts) => {
      return services.getOrganizationMembers({ ...opts });
    }),

  delete: protectedOrganizationProcedure({ members: ["remove"] })
    .input(schemas.removeOrganizationMemberSchema)
    .mutation((opts) => {
      return services.removeOrganizationMember({ ...opts });
    }),

  updateMemberRole: protectedOrganizationProcedure({ members: ["update"] })
    .input(schemas.updateMemberRoleSchema)
    .mutation((opts) => {
      return services.updateMemberRole({ ...opts });
    }),
} satisfies TRPCRouterRecord;
