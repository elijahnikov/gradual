export const VARIATION_COLORS = [
  { name: "Green", value: "#32AA40" },
  { name: "Amber", value: "#F59E0B" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Pink", value: "#EC4899" },
  { name: "Cyan", value: "#06B6D4" },
  { name: "Orange", value: "#F97316" },
  { name: "Blue", value: "#3B82F6" },
  { name: "Red", value: "#EF4444" },
  { name: "Teal", value: "#14B8A6" },
  { name: "Indigo", value: "#6366F1" },
  { name: "Rose", value: "#F43F5E" },
  { name: "Lime", value: "#84CC16" },
  { name: "Fuchsia", value: "#D946EF" },
  { name: "Sky", value: "#0EA5E9" },
  { name: "Emerald", value: "#10B981" },
  { name: "Slate", value: "#64748B" },
] as const;

export type VariationColor = (typeof VARIATION_COLORS)[number]["value"];

export function getRandomVariationColor(): string {
  const index = Math.floor(Math.random() * VARIATION_COLORS.length);
  return VARIATION_COLORS[index]?.value ?? VARIATION_COLORS[0].value;
}

export function getVariationColorByIndex(index: number): string {
  return (
    VARIATION_COLORS[index % VARIATION_COLORS.length]?.value ??
    VARIATION_COLORS[0].value
  );
}

export const transformToMetricsData = (
  evaluations: Array<{
    time: string;
    environmentId: string;
    variationId: string | null;
    count: number | bigint;
  }>,
  environments: Array<{ id: string; name: string }>,
  variations: Array<{ id: string; name: string }>,
  startDate: Date,
  endDate: Date,
  granularity: "hour" | "6hour" | "day"
) => {
  const environmentMap = new Map(environments.map((e) => [e.id, e.name]));
  const variationMap = new Map(variations.map((v) => [v.id, v.name]));

  const buckets: Array<{
    time: Date;
    label: string;
    byEnvironment: Record<string, Record<string, number>>;
    total: number;
  }> = [];

  const bucketMs =
    granularity === "hour"
      ? 60 * 60 * 1000
      : granularity === "6hour"
        ? 6 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;

  let currentTime = new Date(startDate);
  while (currentTime < endDate) {
    const byEnvironment: Record<string, Record<string, number>> = {};
    for (const env of environments) {
      const envData: Record<string, number> = {};
      for (const variation of variations) {
        envData[variation.name] = 0;
      }
      byEnvironment[env.name] = envData;
    }

    buckets.push({
      time: new Date(currentTime),
      label: formatTimeLabel(currentTime, granularity),
      byEnvironment,
      total: 0,
    });

    currentTime = new Date(currentTime.getTime() + bucketMs);
  }

  for (const evalEntry of evaluations) {
    const evalTime = new Date(evalEntry.time);
    const envName = environmentMap.get(evalEntry.environmentId);
    const varName = evalEntry.variationId
      ? variationMap.get(evalEntry.variationId)
      : null;

    if (!(envName && varName)) {
      continue;
    }

    const bucketIndex = buckets.findIndex((b) => {
      const bucketEnd = new Date(b.time.getTime() + bucketMs);
      return evalTime >= b.time && evalTime < bucketEnd;
    });

    if (bucketIndex !== -1) {
      const bucket = buckets[bucketIndex];
      if (bucket) {
        const envData = bucket.byEnvironment[envName];
        if (envData) {
          envData[varName] = (envData[varName] ?? 0) + Number(evalEntry.count);
        }
        bucket.total += Number(evalEntry.count);
      }
    }
  }

  return buckets;
};

const formatTimeLabel = (
  date: Date,
  granularity: "hour" | "6hour" | "day"
): string => {
  if (granularity === "day") {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleTimeString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    hour12: true,
  });
};

export const initializeHourlyStructures = (
  environments: Array<{ id: string; name: string }>,
  variations: Array<{ id: string; name: string }>
) => {
  const totals: Record<string, Record<string, number>> = {};
  for (const env of environments) {
    const envTotals: Record<string, number> = {};
    for (const variation of variations) {
      envTotals[variation.name] = 0;
    }
    totals[env.name] = envTotals;
  }
  return totals;
};

export const processHourData = (
  hourDate: Date,
  evaluations: Array<{
    time: string;
    environmentId: string;
    variationId: string | null;
    count: number | bigint;
  }>,
  environments: Array<{ id: string; name: string }>,
  variations: Array<{ id: string; name: string }>,
  environmentMap: Map<string, string>,
  variationMap: Map<string, string>,
  totals: Record<string, Record<string, number>>
) => {
  const formattedTime = hourDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
  });

  const byEnvironment: Record<string, Record<string, number>> = {};
  for (const env of environments) {
    const envData: Record<string, number> = {};
    for (const variation of variations) {
      envData[variation.name] = 0;
    }
    byEnvironment[env.name] = envData;
  }

  const evaluationsForHour = evaluations.filter((e) => {
    const eDate = new Date(e.time);
    return eDate.getTime() === hourDate.getTime();
  });

  for (const evalEntry of evaluationsForHour) {
    const envName = environmentMap.get(evalEntry.environmentId);
    const varName = evalEntry.variationId
      ? variationMap.get(evalEntry.variationId)
      : null;

    if (envName && varName) {
      const c = Number(evalEntry.count);
      const envData = byEnvironment[envName];
      const envTotals = totals[envName];
      if (envData) {
        envData[varName] = c;
      }
      if (envTotals) {
        envTotals[varName] = (envTotals[varName] ?? 0) + c;
      }
    }
  }

  return { time: formattedTime, byEnvironment };
};

export const transformEvaluationsToHourlyData = (
  evaluations: Array<{
    time: string;
    environmentId: string;
    variationId: string | null;
    count: number | bigint;
  }>,
  environments: Array<{ id: string; name: string }>,
  variations: Array<{ id: string; name: string }>,
  today: Date
) => {
  const environmentMap = new Map(environments.map((e) => [e.id, e.name]));
  const variationMap = new Map(variations.map((v) => [v.id, v.name]));

  const totals = initializeHourlyStructures(environments, variations);
  const hourlyData: Array<{
    time: string;
    byEnvironment: Record<string, Record<string, number>>;
  }> = [];

  for (let i = 23; i >= 0; i--) {
    const hourDate = new Date(today);
    hourDate.setHours(hourDate.getHours() - i, 0, 0, 0);
    const hourEntry = processHourData(
      hourDate,
      evaluations,
      environments,
      variations,
      environmentMap,
      variationMap,
      totals
    );
    hourlyData.push(hourEntry);
  }

  return { hourlyData, totals };
};
