import { UsageData } from '../types';

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

// Format large numbers with thousands separators
export function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }) + 'K';
  }
  return num.toLocaleString('en-US');
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
