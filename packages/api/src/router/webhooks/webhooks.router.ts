import type { TRPCRouterRecord } from "@trpc/server";
import { protectedOrganizationProcedure, publicProcedure } from "../../trpc";
import * as schemas from "./webhooks.schemas";
import * as services from "./webhooks.services";

export const webhooksRouter = {
  create: protectedOrganizationProcedure({ organization: ["update"] })
    .input(schemas.createWebhookSchema)
    .mutation((opts) => services.createWebhook({ ...opts })),
  list: protectedOrganizationProcedure({ organization: ["read"] })
    .input(schemas.listWebhooksSchema)
    .query((opts) => services.listWebhooks({ ...opts })),
  get: protectedOrganizationProcedure({ organization: ["read"] })
    .input(schemas.getWebhookSchema)
    .query((opts) => services.getWebhook({ ...opts })),
  update: protectedOrganizationProcedure({ organization: ["update"] })
    .input(schemas.updateWebhookSchema)
    .mutation((opts) => services.updateWebhook({ ...opts })),
  delete: protectedOrganizationProcedure({ organization: ["update"] })
    .input(schemas.deleteWebhookSchema)
    .mutation((opts) => services.deleteWebhook({ ...opts })),
  test: protectedOrganizationProcedure({ organization: ["update"] })
    .input(schemas.testWebhookSchema)
    .mutation((opts) => services.testWebhook({ ...opts })),
  listDeliveries: protectedOrganizationProcedure({ organization: ["read"] })
    .input(schemas.listWebhookDeliveriesSchema)
    .query((opts) => services.listWebhookDeliveries({ ...opts })),
  dispatch: publicProcedure
    .input(schemas.dispatchWebhookSchema)
    .mutation((opts) => services.dispatchWebhookEvent({ ...opts })),
} satisfies TRPCRouterRecord;
