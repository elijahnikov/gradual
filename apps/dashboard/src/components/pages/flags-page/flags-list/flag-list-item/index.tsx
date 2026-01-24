import type { RouterOutputs } from "@gradual/api";
import { Avatar, AvatarFallback, AvatarImage } from "@gradual/ui/avatar";
import { Badge } from "@gradual/ui/badge";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@gradual/ui/chart";
import { Text } from "@gradual/ui/text";
import dayjs from "dayjs";
import { Area, AreaChart } from "recharts";

const chartData = [
  { month: "January", mobile: 80 },
  { month: "February", mobile: 200 },
  { month: "March", mobile: 120 },
  { month: "April", mobile: 190 },
  { month: "May", mobile: 130 },
  { month: "June", mobile: 140 },
];

const chartConfig = {
  mobile: {
    label: "Mobile",
    color: "#60a5fa",
  },
} satisfies ChartConfig;

export default function FlagListItem({
  flag,
}: {
  flag: RouterOutputs["featureFlags"]["getAll"]["data"][number];
}) {
  return (
    <div className="flex h-14 items-center px-4">
      <div className="flex flex-col">
        <Text weight="plus">{flag.name}</Text>
        <Text className="font-mono text-ui-fg-muted" size="xsmall">
          {flag.key}
        </Text>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="p-2">
          <ChartContainer className="h-12 w-36" config={chartConfig}>
            <AreaChart accessibilityLayer data={chartData}>
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
              <defs>
                <linearGradient id="fillDesktop" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-desktop)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-desktop)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
                <linearGradient id="fillMobile" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-mobile)"
                    stopOpacity={0.8}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-mobile)"
                    stopOpacity={0.1}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="mobile"
                fill="url(#fillMobile)"
                fillOpacity={0.4}
                stackId="a"
                stroke="var(--color-mobile)"
                type="linear"
              />
            </AreaChart>
          </ChartContainer>
        </div>
        <Avatar className="shadow-buttons-neutral">
          <AvatarImage src={flag.maintainer?.image ?? undefined} />
          <AvatarFallback>{flag.maintainer?.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <Badge variant="secondary">
          <Text size="xsmall" weight="plus">
            {dayjs(flag.createdAt).format("MMM D")}
          </Text>
        </Badge>
      </div>
    </div>
  );
}
