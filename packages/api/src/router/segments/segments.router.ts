import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./segments.schemas";
import * as services from "./segments.services";

export const segmentsRouter = {
  getByKey: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.getSegmentByKeySchema)
    .query((opts) => services.getSegmentByKey({ ...opts })),

  list: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.listSegmentsSchema)
    .query((opts) => services.listSegments({ ...opts })),

  create: protectedOrganizationProcedure({ flags: ["create"] })
    .input(schemas.createSegmentSchema)
    .mutation((opts) => services.createSegment({ ...opts })),

  update: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.updateSegmentSchema)
    .mutation((opts) => services.updateSegment({ ...opts })),
} satisfies TRPCRouterRecord;
