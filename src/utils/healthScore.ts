import { UsageData, HealthScore } from '../types';
import { sumMetrics } from './metrics';

// Feature categories for adoption scoring
const FEATURE_CATEGORIES = [
  { name: 'Publish/Subscribe', metrics: ['publish', 'subscribe', 'transaction_publish', 'transaction_subscribe'] },
  { name: 'Presence', metrics: ['pres_pub', 'transaction_presence_herenow', 'transaction_presence_heartbeats'] },
  { name: 'Storage', metrics: ['history', 'transaction_history', 'history_msgs'] },
  { name: 'Access Manager', metrics: ['transaction_accessmanager_grants', 'transaction_accessmanager_audits'] },
  { name: 'Push', metrics: ['transaction_apns_sent', 'transaction_fcm_sent', 'push'] },
  { name: 'Functions', metrics: ['executions', 'transaction_xhr'] },
  { name: 'Message Actions', metrics: ['message_actions', 'transaction_message_actions_add'] },
  { name: 'Signals', metrics: ['signals', 'transaction_signal'] },
  { name: 'App Context', metrics: ['transaction_objects_create_user', 'transaction_kv_read', 'transaction_kv_write'] },
  { name: 'Files', metrics: ['transaction_files_publish', 'transaction_files_get_file'] },
  { name: 'Channel Groups', metrics: ['transaction_channel_group_add', 'transaction_channel_group_list'] },
  { name: 'Illuminate', metrics: ['transaction_illuminate_query', 'transaction_illuminate_ingest'] },
];

// Helper to sum multiple possible metric names
function sumMultipleMetrics(usage: UsageData, ...metricNames: string[]): number {
  let total = 0;
  for (const name of metricNames) {
    const metric = usage[name];
    if (metric) {
      total += sumMetrics(metric);
    }
  }
  return total;
}

// Calculate growth score by comparing recent vs older periods
export function calculateGrowthScore(monthlyTotals: number[]): number {
  if (monthlyTotals.length < 2) return 50; // Neutral if insufficient data
  
  // Compare recent 3 months to previous 3 months
  const recent = monthlyTotals.slice(-3);
  const older = monthlyTotals.slice(-6, -3);
  
  if (older.length === 0) return 50;
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  
  if (olderAvg === 0) return recentAvg > 0 ? 100 : 50;
  
  const growthRate = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  // Map growth rate to 0-100 score
  // -50% or worse = 0, +50% or better = 100, 0% = 50
  return Math.max(0, Math.min(100, 50 + growthRate));
}

// Calculate adoption score based on feature usage
export function calculateAdoptionScore(usage: UsageData): number {
  let adoptedCount = 0;
  
  for (const category of FEATURE_CATEGORIES) {
    const hasUsage = category.metrics.some(metric => {
      const data = usage[metric];
      return data && sumMetrics(data) > 0;
    });
    if (hasUsage) adoptedCount++;
  }
  
  return Math.round((adoptedCount / FEATURE_CATEGORIES.length) * 100);
}

// Calculate efficiency score by detecting anti-patterns
export function calculateEfficiencyScore(usage: UsageData): number {
  let score = 100;
  
  const total = sumMultipleMetrics(usage, 'transactions_total', 'txn_total', 'transaction_total');
  const replicated = sumMultipleMetrics(usage, 'replicated', 'transaction_replicated', 'txn_replicated');
  const edge = sumMultipleMetrics(usage, 'edge', 'transaction_edge', 'txn_edge');
  const signals = sumMultipleMetrics(usage, 'signals', 'transaction_signal', 'txn_signal');
  const presence = sumMultipleMetrics(usage, 'pres_pub', 'transaction_presence_herenow');
  const presenceHeartbeats = sumMultipleMetrics(usage, 'transaction_presence_heartbeats');
  const publish = sumMultipleMetrics(usage, 'publish', 'transaction_publish');
  
  // Penalty: High replicated ratio when edge could work (80%+ replicated, no edge)
  if (total > 0 && replicated / total > 0.8 && edge === 0) {
    score -= 15;
  }
  
  // Penalty: Presence is too high a proportion (>30% of total)
  if (total > 0 && (presence + presenceHeartbeats) / total > 0.3) {
    score -= 20;
  }
  
  // Penalty: High publish volume but not using signals
  if (publish > 100000 && signals === 0) {
    score -= 10;
  }
  
  return Math.max(0, score);
}

// Calculate engagement score based on usage consistency
export function calculateEngagementScore(dailyValues: number[]): number {
  if (dailyValues.length < 7) return 50; // Need at least a week
  
  // Filter out zero days
  const nonZeroDays = dailyValues.filter(v => v > 0);
  if (nonZeroDays.length < 3) return 20; // Very inconsistent
  
  const mean = nonZeroDays.reduce((a, b) => a + b, 0) / nonZeroDays.length;
  if (mean === 0) return 0;
  
  const variance = nonZeroDays.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / nonZeroDays.length;
  const stdDev = Math.sqrt(variance);
  
  // Coefficient of variation (lower is more consistent)
  const cv = stdDev / mean;
  
  // Map CV to score: CV of 0 = 100, CV of 2+ = 0
  return Math.max(0, Math.min(100, 100 - (cv * 50)));
}

// Extract daily values from usage data for engagement calculation
export function extractDailyValues(usage: UsageData, startDate: string, endDate: string): number[] {
  const values: number[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayTimestamp = Math.floor(d.getTime() / 1000).toString();
    let dayTotal = 0;
    
    // Sum transactions_total for this day
    const totalMetric = usage.transactions_total || usage.txn_total || usage.transaction_total;
    if (totalMetric) {
      for (const monthKey of Object.keys(totalMetric)) {
        const monthData = totalMetric[monthKey];
        if (monthData?.days?.[dayTimestamp]) {
          dayTotal += monthData.days[dayTimestamp];
        }
      }
    }
    
    values.push(dayTotal);
  }
  
  return values;
}

// Extract monthly totals for growth calculation
export function extractMonthlyTotals(usage: UsageData): number[] {
  const monthlyMap = new Map<string, number>();
  
  const totalMetric = usage.transactions_total || usage.txn_total || usage.transaction_total;
  if (!totalMetric) return [];
  
  for (const monthKey of Object.keys(totalMetric)) {
    const monthData = totalMetric[monthKey];
    if (monthData?.days) {
      const monthTotal = Object.values(monthData.days).reduce((sum: number, val) => {
        return sum + (typeof val === 'number' ? val : 0);
      }, 0);
      monthlyMap.set(monthKey, monthTotal);
    }
  }
  
  // Sort by month timestamp and return values
  return Array.from(monthlyMap.entries())
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .map(([, value]) => value);
}

// Calculate overall health score
export function calculateHealthScore(
  usage: UsageData,
  startDate: string,
  endDate: string
): HealthScore {
  const monthlyTotals = extractMonthlyTotals(usage);
  const dailyValues = extractDailyValues(usage, startDate, endDate);
  
  const growth = calculateGrowthScore(monthlyTotals);
  const adoption = calculateAdoptionScore(usage);
  const efficiency = calculateEfficiencyScore(usage);
  const engagement = calculateEngagementScore(dailyValues);
  
  // Weighted average
  const overall = Math.round(
    growth * 0.30 +
    adoption * 0.25 +
    efficiency * 0.25 +
    engagement * 0.20
  );
  
  // Determine trend based on growth score
  let trend: 'improving' | 'stable' | 'declining';
  if (growth >= 60) trend = 'improving';
  else if (growth >= 40) trend = 'stable';
  else trend = 'declining';
  
  return {
    overall,
    components: { growth, adoption, efficiency, engagement },
    trend,
    calculatedAt: new Date(),
  };
}
