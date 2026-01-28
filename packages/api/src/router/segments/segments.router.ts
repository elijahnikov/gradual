import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./segments.schemas";
import * as services from "./segments.services";

export const segmentsRouter = {
  list: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.listSegmentsSchema)
    .query((opts) => services.listSegments({ ...opts })),

  create: protectedOrganizationProcedure({ flags: ["create"] })
    .input(schemas.createSegmentSchema)
    .mutation((opts) => services.createSegment({ ...opts })),
} satisfies TRPCRouterRecord;
