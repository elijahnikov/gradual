export interface MetricsBucket {
  time: Date;
  label: string;
  byEnvironment: Record<string, Record<string, number>>;
  total: number;
}

export interface MetricsVariation {
  id: string;
  name: string;
}

export interface MetricsEnvironment {
  id: string;
  name: string;
}

export interface MetricsData {
  data: MetricsBucket[];
  variations: MetricsVariation[];
  environments: MetricsEnvironment[];
  totals: Record<string, number>;
  granularity: "hour" | "6hour" | "day";
  startDate: Date;
  endDate: Date;
}
