import { Text } from "@gradual/ui/text";
import { useTheme } from "@gradual/ui/theme";
import { Liveline } from "liveline";
import { useMemo } from "react";

const ONE_DAY_SECS = 86_400;

function formatLivelineTime(t: number): string {
  const date = new Date(t * 1000);
  const now = Date.now() / 1000;
  const ago = now - t;

  if (ago > ONE_DAY_SECS) {
    return date.toLocaleString(undefined, {
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

interface Props {
  data: { time: string; count: number }[];
  liveEvalCount: number;
}

export default function HomeVolumeChart({ data, liveEvalCount }: Props) {
  const { resolvedTheme } = useTheme();

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        time: new Date(d.time).getTime() / 1000,
        value: d.count,
      })),
    [data]
  );

  const currentValue = useMemo(() => {
    const lastDbValue = chartData.at(-1)?.value ?? 0;
    return lastDbValue + liveEvalCount;
  }, [chartData, liveEvalCount]);

  const windowSecs = useMemo(() => {
    const first = chartData[0];
    const last = chartData.at(-1);
    if (!(first && last)) {
      return 60;
    }
    const span = last.time - first.time;
    return Math.max(60, Math.ceil(span * 1.1));
  }, [chartData]);

  if (chartData.length === 0 && liveEvalCount === 0) {
    return (
      <div className="flex h-full items-center justify-center text-ui-fg-muted">
        <Text size="small">No evaluation data in the last 7 days</Text>
      </div>
    );
  }

  return (
    <Liveline
      badge={false}
      color="#3b82f6"
      data={chartData}
      formatTime={formatLivelineTime}
      formatValue={(v) => String(Math.round(v))}
      grid
      momentum={false}
      scrub
      theme={resolvedTheme}
      value={currentValue}
      window={windowSecs}
    />
  );
}
