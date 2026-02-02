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
