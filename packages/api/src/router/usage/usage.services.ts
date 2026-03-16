import { FREE_LIMITS, PLAN_LIMITS } from "../../lib/plan-limits";
import type { ProtectedTRPCContext } from "../../trpc";
import type { GetUsageByOrganizationIdInput } from "./usage.schemas";

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

  let mauLimit: number | null = FREE_LIMITS.mau;
  const items = subscriptionsData?.result?.items;
  if (Array.isArray(items) && items.length > 0) {
    const productId: string | undefined = items[0]?.productId;
    if (productId && productId in PLAN_LIMITS) {
      mauLimit = PLAN_LIMITS[productId]?.mau ?? FREE_LIMITS.mau;
    }
  }

  return {
    currentMAU,
    mauLimit,
    limitReached: mauLimit !== null && currentMAU >= mauLimit,
  };
};
