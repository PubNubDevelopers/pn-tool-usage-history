export interface Session {
  userid: number;
  token: string;
  accountid: number;
}

export interface Account {
  id: number;
  email: string;
  properties?: {
    company?: string;
  };
}

export interface App {
  id: number;
  name: string;
  created: string;
  owner_id: number;
}

export interface KeySet {
  id: number;
  created: string;
  properties?: {
    name?: string;
  };
  publish_key?: string;
  subscribe_key?: string;
}

export interface UsageMetric {
  [date: string]: {
    sum: number;
  };
}

export interface UsageData {
  transactions_total?: UsageMetric;
  replicated?: UsageMetric;
  edge?: UsageMetric;
  signals?: UsageMetric;
  executions?: UsageMetric;
  message_actions?: UsageMetric;
  mtd_uuid?: UsageMetric;
  [key: string]: UsageMetric | undefined;
}

export interface MetricDefinition {
  metric: string;
  type: 'rep' | 'edg' | 'sig' | 'ma' | 'fun';
  feature: string;
  action: string;
}

export interface ChartDataPoint {
  date: string;
  replicated: number;
  edge: number;
  signals: number;
  total: number;
}

export interface FeatureBreakdown {
  feature: string;
  transactions: number;
  cost: number;
}

export interface TransactionTypeSummary {
  name: string;
  value: number;
  color: string;
}
