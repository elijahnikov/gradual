import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure } from "../../trpc";

import * as schemas from "./audit-log.schemas";
import * as services from "./audit-log.services";

export const auditLogRouter = {
  list: protectedOrganizationProcedure({ organization: ["read"] })
    .input(schemas.listAuditLogsSchema)
    .query((opts) => services.listAuditLogs({ ...opts })),
  export: protectedOrganizationProcedure({ organization: ["read"] })
    .input(schemas.exportAuditLogsSchema)
    .query((opts) => services.exportAuditLogs({ ...opts })),
} satisfies TRPCRouterRecord;
