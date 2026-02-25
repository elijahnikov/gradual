import { analyticsRouter } from "./router/analytics/analytics.router";
import { apiKeyRouter } from "./router/api-key/api-key.router";
import { attributesRouter } from "./router/attributes/attributes.router";
import { authRouter } from "./router/auth/auth.router";
import { environmentRouter } from "./router/environment/environment.router";
import { evaluationsRouter } from "./router/evaluations/evaluations.router";
import { featureFlagsRouter } from "./router/feature-flags/feature-flags.router";
import { organizationRouter } from "./router/organization/organization.router";
import { organizationMemberRouter } from "./router/organization-member/organization-member.router";
import { projectRouter } from "./router/project/project.router";
import { segmentsRouter } from "./router/segments/segments.router";
import { snapshotsRouter } from "./router/snapshots/snapshots.router";
import { usageRouter } from "./router/usage/usage.router";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  analytics: analyticsRouter,
  auth: authRouter,
  attributes: attributesRouter,
  environment: environmentRouter,
  evaluations: evaluationsRouter,
  organization: organizationRouter,
  organizationMember: organizationMemberRouter,
  project: projectRouter,
  apiKey: apiKeyRouter,
  featureFlags: featureFlagsRouter,
  segments: segmentsRouter,
  snapshots: snapshotsRouter,
  usage: usageRouter,
});

export type AppRouter = typeof appRouter;
