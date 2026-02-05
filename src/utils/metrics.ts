import { UsageData, ChartDataPoint, FeatureBreakdown, TransactionTypeSummary } from '../types';

// Sum all values in a metric (handles new nested timestamp structure)
export function sumMetrics(metricData?: Record<string, any>): number {
  if (!metricData || typeof metricData !== 'object') return 0;

  let total = 0;
  
  // New structure: { monthTimestamp: { days: { dayTimestamp: value } } }
  for (const monthKey of Object.keys(metricData)) {
    const monthData = metricData[monthKey];
    if (monthData && typeof monthData === 'object') {
      // Check if it has the days structure
      if (monthData.days && typeof monthData.days === 'object') {
        for (const dayValue of Object.values(monthData.days)) {
          if (typeof dayValue === 'number') {
            total += dayValue;
          }
        }
      } 
      // Fallback for old structure with sum field
      else if (monthData.sum !== undefined) {
        total += monthData.sum;
      }
    }
  }
  
  return total;
}

// Format large numbers
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(2) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2) + 'K';
  }
  return num.toLocaleString();
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Helper to find metric value from the nested timestamp structure
function getMetricValue(usage: UsageData, date: string, ...possibleNames: string[]): number {
  // Convert date string to Unix timestamp (in seconds)
  const dayTimestamp = Math.floor(new Date(date).getTime() / 1000).toString();
  
  for (const name of possibleNames) {
    const metric = usage[name];
    if (!metric || typeof metric !== 'object') continue;
    
    // The structure is: { monthTimestamp: { days: { dayTimestamp: value } } }
    // Find the month that contains this day
    for (const monthKey of Object.keys(metric)) {
      const monthData = metric[monthKey];
      if (monthData && typeof monthData === 'object' && monthData.days) {
        const value = monthData.days[dayTimestamp];
        if (value !== undefined) {
          return typeof value === 'number' ? value : 0;
        }
      }
    }
  }
  return 0;
}

// Process usage data into chart format
export function processChartData(
  usage: UsageData,
  startDate: string,
  endDate: string,
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year' = 'day'
): ChartDataPoint[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Always generate daily data points first
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }
  
  const dataPoints = dates.map((date) => {
    const replicated = getMetricValue(usage, date, 'replicated', 'transaction_replicated', 'txn_replicated');
    const edge = getMetricValue(usage, date, 'edge', 'transaction_edge', 'txn_edge');
    const signals = getMetricValue(usage, date, 'signals', 'transaction_signal', 'txn_signal');
    const functions = getMetricValue(usage, date, 'executions', 'transaction_xhr', 'transaction_kv_read', 'transaction_kv_write', 'functions');
    const messageActions = getMetricValue(usage, date, 'message_actions', 'transaction_message_actions_add', 'transaction_message_actions_get', 'transaction_message_actions_remove');
    
    // Try all possible MAU metric names
    const mau = getMetricValue(
      usage, 
      date, 
      'mtd_uuid', 
      'pn_uuid', 
      'unique_users',
      'mau',
      'monthly_active_users',
      'active_users',
      'uuid',
      'key_ip_ua',
      'channel'
    );
    
    // Try multiple ways to get total, or sum up all major metrics
    let total = getMetricValue(usage, date, 'transactions_total', 'txn_total', 'transaction_total');
    
    // If no explicit total, sum up what we have
    if (total === 0) {
      const publish = getMetricValue(usage, date, 'publish', 'transaction_publish', 'msgs_total');
      const subscribe = getMetricValue(usage, date, 'subscribe', 'transaction_subscribe', 'subscribe_msgs');
      const history = getMetricValue(usage, date, 'history', 'transaction_history', 'history_msgs');
      total = replicated + edge + signals + functions + messageActions + publish + subscribe + history;
    }
    
    return { date, replicated, edge, signals, functions, messageActions, total, mau };
  });
  
  // Debug MAU data
  const nonZeroMAU = dataPoints.filter(p => p.mau > 0);
  if (nonZeroMAU.length > 0) {
    console.log(`Found ${nonZeroMAU.length} days with MAU data. Sample:`, nonZeroMAU[0]);
  } else {
    console.log('No MAU data found. Available metrics:', Object.keys(usage).filter(k => k.toLowerCase().includes('uuid') || k.toLowerCase().includes('user') || k.toLowerCase().includes('mau') || k.toLowerCase().includes('channel')));
  }

  // Debug: log sample data points
  if (dataPoints.length > 0) {
    console.log(`Generated ${dataPoints.length} daily data points for granularity: ${granularity}`);
    const nonZeroPoints = dataPoints.filter(p => p.total > 0 || p.replicated > 0 || p.edge > 0 || p.signals > 0);
    console.log(`Non-zero data points: ${nonZeroPoints.length}`);
    if (nonZeroPoints.length > 0) {
      console.log('Sample non-zero point:', nonZeroPoints[0]);
    }
  }

  // Aggregate by granularity if needed
  if (granularity !== 'day') {
    const aggregated = aggregateByGranularity(dataPoints, granularity);
    console.log(`Aggregated to ${aggregated.length} ${granularity} data points`);
    if (aggregated.length > 0) {
      console.log('Sample aggregated point:', aggregated[0]);
    }
    return aggregated;
  }

  return dataPoints;
}

// Aggregate data points by time granularity
function aggregateByGranularity(
  dataPoints: ChartDataPoint[],
  granularity: 'week' | 'month' | 'quarter' | 'year'
): ChartDataPoint[] {
  const grouped = new Map<string, ChartDataPoint>();

  dataPoints.forEach(point => {
    const date = new Date(point.date);
    let key: string;

    switch (granularity) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        key = `${date.getFullYear()}-01-01`;
        break;
      default:
        key = point.date;
    }

    if (!grouped.has(key)) {
      grouped.set(key, { date: key, replicated: 0, edge: 0, signals: 0, functions: 0, messageActions: 0, total: 0, mau: 0 });
    }

    const existing = grouped.get(key)!;
    existing.replicated += point.replicated;
    existing.edge += point.edge;
    existing.signals += point.signals;
    existing.functions += point.functions || 0;
    existing.messageActions += point.messageActions || 0;
    existing.total += point.total;
    existing.mau += point.mau || 0;
  });

  return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// Legacy feature metric mappings - kept for backwards compatibility
const FEATURE_METRICS: Record<string, string[]> = {
  // These are now handled in directMetrics, kept here as fallback
};

// Process feature breakdown (updated to handle new structure)
export function processFeatureData(usage: UsageData): FeatureBreakdown[] {
  const features: FeatureBreakdown[] = [];

  // Comprehensive feature mapping - checks all possible metric names
  const directMetrics: Record<string, string[]> = {
    'Publish': ['publish', 'publish_ssl', 'publish_non_ssl', 'transaction_publish', 'publish_transactions'],
    'Subscribe': ['subscribe', 'subscribe_ssl', 'subscribe_non_ssl', 'subscribe_msgs', 'subscribe_msgs_ssl', 'subscribe_msgs_non_ssl', 'transaction_subscribe', 'subscribe_transactions'],
    'Storage': ['history', 'history_msgs', 'history_msgs_ssl', 'history_msgs_non_ssl', 'transaction_history', 'transaction_history_messages_count', 'history_transactions', 'history_ssl'],
    'Presence': ['pres_pub', 'transaction_presence_herenow', 'transaction_presence_wherenow', 'transaction_presence_setuserstate', 'transaction_presence_getuserstate', 'transaction_presence_heartbeats', 'transaction_presence_leave', 'presence_herenow_transactions', 'presence_heartbeats_transactions'],
    'Access Manager': ['transaction_accessmanager_grants', 'transaction_accessmanager_audits', 'transaction_accessmanager_clienterrors', 'accessmanager_grants_transactions', 'accessmanager_audits_transactions'],
    'Message Actions': ['message_actions', 'transaction_message_actions_add', 'transaction_message_actions_get', 'transaction_message_actions_remove'],
    'App Context': ['transaction_objects_create_user', 'transaction_objects_create_space', 'transaction_objects_get_user', 'transaction_objects_get_space', 'transaction_objects_update_user', 'transaction_objects_update_space', 'transaction_objects_delete_user', 'transaction_objects_delete_space', 'transaction_objects_get_all_users', 'transaction_objects_get_all_spaces', 'transaction_objects_get_user_space_memberships', 'transaction_objects_get_space_user_memberships', 'transaction_objects_update_user_space_memberships', 'transaction_objects_update_space_user_memberships', 'transaction_internal_publish_objects', 'transaction_kv_read', 'transaction_kv_write'],
    'Files': ['transaction_files_publish', 'transaction_files_get_file', 'transaction_files_delete_file', 'transaction_files_generate_url', 'transaction_files_get_all_files', 'transaction_files_clienterrors', 'transaction_files_unauthorized'],
    'Push Notifications': ['transaction_apns_sent', 'transaction_fcm_sent', 'transaction_apns_removed', 'transaction_fcm_removed', 'transaction_push_device_writes', 'transaction_push_device_reads', 'push'],
    'Functions': ['executions', 'transaction_xhr'],
    'Signals': ['signals', 'transaction_signal', 'transaction_subscribe_signal'],
    'Channel Groups': ['transaction_channel_group_add', 'transaction_channel_group_remove', 'transaction_channel_group_list', 'transaction_channel_group_list_all'],
    'Events and Actions': ['transaction_fire', 'transaction_fire_client', 'transaction_fire_eh'],
    'Illuminate': ['transaction_illuminate_query', 'transaction_illuminate_ingest'],
  };

  for (const [feature, metrics] of Object.entries(directMetrics)) {
    let total = 0;
    for (const metric of metrics) {
      const data = usage[metric];
      if (data) {
        total += sumMetrics(data);
      }
    }
    if (total > 0) {
      features.push({
        feature,
        transactions: total,
        cost: 0,
      });
    }
  }

  // Also check old feature metrics
  for (const [feature, metrics] of Object.entries(FEATURE_METRICS)) {
    if (features.some(f => f.feature === feature)) continue;
    
    let total = 0;
    for (const metric of metrics) {
      const data = usage[metric];
      if (data) {
        total += sumMetrics(data);
      }
    }
    if (total > 0) {
      features.push({
        feature,
        transactions: total,
        cost: 0,
      });
    }
  }

  return features.sort((a, b) => b.transactions - a.transactions);
}

import { METRIC_COLORS } from '../config/chartColors';

// Process transaction types for pie chart (updated for new structure)
export function processTransactionTypes(usage: UsageData): TransactionTypeSummary[] {
  const types: TransactionTypeSummary[] = [
    {
      name: 'Replicated',
      value: sumMetrics(usage.replicated),
      color: METRIC_COLORS.replicated,
    },
    {
      name: 'Edge',
      value: sumMetrics(usage.edge),
      color: METRIC_COLORS.edge,
    },
    {
      name: 'Signals',
      value: sumMetrics(usage.signals),
      color: METRIC_COLORS.signals,
    },
    {
      name: 'Message Actions',
      value: sumMetrics(usage.message_actions),
      color: METRIC_COLORS.messageActions,
    },
    {
      name: 'Functions',
      value: sumMetrics(usage.executions),
      color: METRIC_COLORS.functions,
    },
  ];
  
  // If all are 0, try to calculate from other metrics
  const totalFromTypes = types.reduce((sum, t) => sum + t.value, 0);
  
  if (totalFromTypes === 0) {
    // Try to get total from message counts
    const publishTotal = sumMetrics(usage.publish) || sumMetrics(usage.msgs_total);
    const subscribeTotal = sumMetrics(usage.subscribe) || sumMetrics(usage.subscribe_msgs);
    
    if (publishTotal > 0 || subscribeTotal > 0) {
      return [
        { name: 'Publish', value: publishTotal, color: METRIC_COLORS.replicated },
        { name: 'Subscribe', value: subscribeTotal, color: METRIC_COLORS.edge },
      ].filter((item) => item.value > 0);
    }
  }
  
  return types.filter((t) => t.value > 0);
}

// Get all metrics as flat table data
export function getMetricsTableData(usage: UsageData | null) {
  if (!usage) return [];

  const rows: Array<{ metric: string; value: number }> = [];

  for (const [metric, data] of Object.entries(usage)) {
    if (data && typeof data === 'object') {
      const total = sumMetrics(data);
      if (total > 0) {
        rows.push({
          metric: formatMetricName(metric),
          value: total,
        });
      }
    }
  }

  return rows.sort((a, b) => b.value - a.value);
}

// Format metric name for display
function formatMetricName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/transaction /gi, '')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Get time range label (e.g., "3 Months", "90 Days")
export function getTimeRangeLabel(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 365) {
    const years = Math.round(diffDays / 365);
    return years === 1 ? '1 Year' : `${years} Years`;
  } else if (diffDays >= 30) {
    const months = Math.round(diffDays / 30);
    return months === 1 ? '1 Month' : `${months} Months`;
  } else if (diffDays >= 7) {
    const weeks = Math.round(diffDays / 7);
    return weeks === 1 ? '1 Week' : `${weeks} Weeks`;
  } else {
    return diffDays === 1 ? '1 Day' : `${diffDays} Days`;
  }
}

// Get maximum value from a metric (for MAU which is cumulative)
function getMaxMetricValue(metricData?: Record<string, any>): number {
  if (!metricData || typeof metricData !== 'object') return 0;

  let maxValue = 0;
  
  // Structure: { monthTimestamp: { days: { dayTimestamp: value } } }
  for (const monthKey of Object.keys(metricData)) {
    const monthData = metricData[monthKey];
    if (monthData && typeof monthData === 'object') {
      if (monthData.days && typeof monthData.days === 'object') {
        for (const dayValue of Object.values(monthData.days)) {
          if (typeof dayValue === 'number' && dayValue > maxValue) {
            maxValue = dayValue;
          }
        }
      }
    }
  }
  
  return maxValue;
}

// Calculate total transactions and MAU from usage data
export function calculateUsageTotals(usage: UsageData): { transactions: number; mau: number } {
  // Sum all transaction metrics
  const transactions = sumMetrics(usage.transactions_total) ||
    sumMetrics(usage.replicated) + sumMetrics(usage.edge) + 
    sumMetrics(usage.signals) + sumMetrics(usage.executions) + 
    sumMetrics(usage.message_actions);
  
  // Get MAU metrics - use MAX instead of SUM since MAU is cumulative
  // Check the fields that actually exist in the data: uuid, key_ip_ua, channel
  const mau = getMaxMetricValue(usage.uuid) ||
    getMaxMetricValue(usage.key_ip_ua) ||
    getMaxMetricValue(usage.channel) ||
    getMaxMetricValue(usage.mtd_uuid) || 
    getMaxMetricValue(usage.pn_uuid) || 
    getMaxMetricValue(usage.unique_users) ||
    getMaxMetricValue(usage.mau) ||
    getMaxMetricValue(usage.monthly_active_users) ||
    getMaxMetricValue(usage.active_users);
  
  return { transactions, mau };
}

// Export data as CSV
export function exportToCSV(data: Array<{ metric: string; value: number }>, filename: string) {
  const headers = ['Metric', 'Value'];
  const rows = data.map((row) => [row.metric, row.value.toString()]);
  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
