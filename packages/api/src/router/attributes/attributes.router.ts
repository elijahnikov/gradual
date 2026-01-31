import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./attributes.schemas";
import * as services from "./attributes.services";

export const attributesRouter = {
  list: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.listAttributesSchema)
    .query((opts) => services.listAttributes({ ...opts })),

  listContexts: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.listContextsSchema)
    .query((opts) => services.listContexts({ ...opts })),

  create: protectedOrganizationProcedure({ flags: ["create"] })
    .input(schemas.createAttributeSchema)
    .mutation((opts) => services.createAttribute({ ...opts })),
} satisfies TRPCRouterRecord;
