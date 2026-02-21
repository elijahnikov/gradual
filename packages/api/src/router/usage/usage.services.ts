import type { ProtectedTRPCContext } from "../../trpc";
import type { GetUsageByOrganizationIdInput } from "./usage.schemas";

const PLAN_MAU_LIMITS: Record<string, number | null> = {
  "89d57bae-1a06-45bf-9f6a-bf437862e775": 1000, // Free
  "9dabe3e7-ef5c-48ba-a1fa-c0446ff99864": 25_000, // Pro
  "702b22c1-f1f7-4aa8-828b-56e322f9a7c2": null, // Enterprise
};

export const getUsageByOrganizationId = async ({
  ctx,
  input,
}: {
  ctx: ProtectedTRPCContext;
  input: GetUsageByOrganizationIdInput;
}) => {
  const [metersResponse, subscriptionsResponse] = await Promise.all([
    ctx.authApi.meters({
      query: { page: 1, limit: 100 },
      asResponse: true,
      headers: ctx.headers,
    }),
    ctx.authApi.subscriptions({
      query: {
        page: 1,
        limit: 10,
        status: "active",
        referenceId: input.organizationId,
      },
      asResponse: true,
      headers: ctx.headers,
    }),
  ]);

  // biome-ignore lint/suspicious/noExplicitAny: Polar response shape
  const metersData: any = await metersResponse.json();
  // biome-ignore lint/suspicious/noExplicitAny: Polar response shape
  const subscriptionsData: any = await subscriptionsResponse.json();

  const mauMeter = metersData?.result?.items?.find(
    // biome-ignore lint/suspicious/noExplicitAny: Polar response shape
    (m: any) => m.meter?.name === "mau"
  );
  const currentMAU: number = mauMeter?.consumedUnits ?? 0;

  let mauLimit: number | null = 1000;
  const items = subscriptionsData?.result?.items;
  if (Array.isArray(items) && items.length > 0) {
    const productId: string | undefined = items[0]?.productId;
    if (productId && productId in PLAN_MAU_LIMITS) {
      mauLimit = PLAN_MAU_LIMITS[productId] ?? null;
    }
  }

  return {
    currentMAU,
    mauLimit,
    limitReached: mauLimit !== null && currentMAU >= mauLimit,
  };
};
