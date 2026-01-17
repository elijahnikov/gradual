import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./api-key.schemas";
import * as services from "./api-key.services";

export const apiKeyRouter = {
  create: protectedOrganizationProcedure({ apiKeys: ["create"] })
    .input(schemas.createApiKeySchema)
    .mutation((opts) => services.createApiKey({ ...opts })),

  getByOrganizationIdAndProjectId: protectedOrganizationProcedure({
    apiKeys: ["read"],
  })
    .input(schemas.getApiKeyByOrganizationIdAndProjectIdSchema)
    .query((opts) =>
      services.getApiKeyByOrganizationIdAndProjectId({ ...opts })
    ),

  revoke: protectedOrganizationProcedure({ apiKeys: ["delete"] })
    .input(schemas.revokeApiKeySchema)
    .mutation((opts) => services.revokeApiKey({ ...opts })),

  listByOrganizationIdAndProjectId: protectedOrganizationProcedure({
    apiKeys: ["read"],
  })
    .input(schemas.listApiKeysByOrganizationIdAndProjectIdSchema)
    .query((opts) =>
      services.listApiKeysByOrganizationIdAndProjectId({ ...opts })
    ),
} satisfies TRPCRouterRecord;
