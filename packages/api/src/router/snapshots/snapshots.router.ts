import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure, publicProcedure } from "../../trpc";

import * as schemas from "./snapshots.schemas";
import * as services from "./snapshots.services";

export const snapshotsRouter = {
  generate: protectedOrganizationProcedure({ flags: ["read"] })
    .input(schemas.generateSnapshotSchema)
    .query((opts) => services.generateSnapshot({ ...opts })),

  publish: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.publishSnapshotSchema)
    .mutation((opts) => services.publishSnapshot({ ...opts })),

  publishAll: protectedOrganizationProcedure({ flags: ["update"] })
    .input(schemas.publishAllSnapshotsSchema)
    .mutation((opts) => services.queueAllSnapshotsPublish({ ...opts })),

  // INTERNAL, CALLED BY CF WORKER
  buildForWorker: publicProcedure
    .input(schemas.buildForWorkerSchema)
    .mutation((opts) => services.buildForWorker({ ...opts })),
} satisfies TRPCRouterRecord;
