import { apiKeyRouter } from "./router/api-key/api-key.router";
import { authRouter } from "./router/auth/auth.router";
import { featureFlagsRouter } from "./router/feature-flags/feature-flags.router";
import { organizationRouter } from "./router/organization/organization.router";
import { organizationMemberRouter } from "./router/organization-member/organization-member.router";
import { projectRouter } from "./router/project/project.router";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  organization: organizationRouter,
  organizationMember: organizationMemberRouter,
  project: projectRouter,
  apiKey: apiKeyRouter,
  featureFlags: featureFlagsRouter,
});

export type AppRouter = typeof appRouter;
