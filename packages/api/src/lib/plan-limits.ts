import type { ProtectedOrganizationTRPCContext } from "../trpc";

export const PLAN_PRODUCT_IDS = {
  FREE: "89d57bae-1a06-45bf-9f6a-bf437862e775",
  PRO: "9dabe3e7-ef5c-48ba-a1fa-c0446ff99864",
  ENTERPRISE: "702b22c1-f1f7-4aa8-828b-56e322f9a7c2",
} as const;

export interface PlanLimits {
  projects: number | null;
  environmentsPerProject: number | null;
  members: number | null;
  mau: number | null;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  [PLAN_PRODUCT_IDS.FREE]: {
    projects: 1,
    environmentsPerProject: 2,
    members: 1,
    mau: 1000,
  },
  [PLAN_PRODUCT_IDS.PRO]: {
    projects: null,
    environmentsPerProject: null,
    members: 10,
    mau: 25_000,
  },
  [PLAN_PRODUCT_IDS.ENTERPRISE]: {
    projects: null,
    environmentsPerProject: null,
    members: null,
    mau: null,
  },
};

export const FREE_LIMITS: PlanLimits = {
  projects: 1,
  environmentsPerProject: 2,
  members: 1,
  mau: 1000,
};

export async function getOrganizationPlanLimits(
  ctx: ProtectedOrganizationTRPCContext,
  organizationId: string
): Promise<PlanLimits> {
  const subscriptionsResponse = await ctx.authApi.subscriptions({
    query: {
      page: 1,
      limit: 10,
      status: "active",
      referenceId: organizationId,
    },
    asResponse: true,
    headers: ctx.headers,
  });

  // biome-ignore lint/suspicious/noExplicitAny: Polar response shape
  const subscriptionsData: any = await subscriptionsResponse.json();
  const items = subscriptionsData?.result?.items;

  if (Array.isArray(items) && items.length > 0) {
    const productId: string | undefined = items[0]?.productId;
    if (productId && productId in PLAN_LIMITS) {
      return PLAN_LIMITS[productId] ?? FREE_LIMITS;
    }
  }

  return FREE_LIMITS;
}
