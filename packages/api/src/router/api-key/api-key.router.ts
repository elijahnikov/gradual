import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./api-key.schemas";
import * as services from "./api-key.services";

export const apiKeyRouter = {
  create: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.createApiKeySchema)
    .mutation((opts) => services.createApiKey({ ...opts })),

  getByOrganizationIdAndProjectId: protectedOrganizationProcedure([
    "owner",
    "admin",
  ])
    .input(schemas.getApiKeyByOrganizationIdAndProjectIdSchema)
    .query((opts) =>
      services.getApiKeyByOrganizationIdAndProjectId({ ...opts })
    ),

  revoke: protectedOrganizationProcedure(["owner", "admin"])
    .input(schemas.revokeApiKeySchema)
    .mutation((opts) => services.revokeApiKey({ ...opts })),

  listByOrganizationIdAndProjectId: protectedOrganizationProcedure([
    "owner",
    "admin",
  ])
    .input(schemas.listApiKeysByOrganizationIdAndProjectIdSchema)
    .query((opts) =>
      services.listApiKeysByOrganizationIdAndProjectId({ ...opts })
    ),
} satisfies TRPCRouterRecord;
