export interface EventFilters {
  variationIds?: string[];
  reasonTypes?: string[];
  targetNameSearch?: string;
  minLatencyUs?: number;
  sdkVersion?: string;
  startDate?: string;
  endDate?: string;
}
