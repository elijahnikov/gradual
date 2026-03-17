import type { TRPCRouterRecord } from "@trpc/server";
import { publicProcedure } from "../../trpc";

import * as schemas from "./evaluations.schemas";
import * as services from "./evaluations.services";

export const evaluationsRouter = {
  // INTERNAL, CALLED BY CF WORKER
  ingest: publicProcedure
    .input(schemas.ingestEvaluationsSchema)
    .mutation((opts) => services.ingestEvaluations({ ...opts })),

  // INTERNAL, CALLED BY CF WORKER CRON
  prune: publicProcedure
    .input(schemas.pruneEvaluationsSchema)
    .mutation((opts) => services.pruneEvaluations({ ...opts })),
} satisfies TRPCRouterRecord;
