export interface MetricsBucket {
  time: Date;
  label: string;
  byEnvironment: Record<string, Record<string, number>>;
  total: number;
}

export interface MetricsVariation {
  id: string;
  name: string;
  color?: string | null;
}
