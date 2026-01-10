import { authRouter } from "./router/auth";
import { organizationRouter } from "./router/organization/organization.router";
import { projectRouter } from "./router/project/project.router";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  organization: organizationRouter,
  project: projectRouter,
});

export type AppRouter = typeof appRouter;
