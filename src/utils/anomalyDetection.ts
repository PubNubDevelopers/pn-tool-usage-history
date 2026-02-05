import { UsageData, Anomaly } from '../types';

// Helper to extract daily values for a metric
function extractDailyMetricValues(
  usage: UsageData,
  metricNames: string[],
  startDate: string,
  endDate: string
): { date: Date; value: number }[] {
  const values: { date: Date; value: number }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayTimestamp = Math.floor(d.getTime() / 1000).toString();
    let dayTotal = 0;
    
    // Try each possible metric name
    for (const metricName of metricNames) {
      const metric = usage[metricName];
      if (metric) {
        for (const monthKey of Object.keys(metric)) {
          const monthData = metric[monthKey];
          if (monthData?.days?.[dayTimestamp]) {
            dayTotal += monthData.days[dayTimestamp];
          }
        }
      }
    }
    
    values.push({ date: new Date(d), value: dayTotal });
  }
  
  return values;
}

// Z-score based anomaly detection (statistical)
export function detectAnomaliesZScore(
  values: { date: Date; value: number }[],
  metricName: string,
  options = { threshold: 2.5, minDataPoints: 14 }
): Anomaly[] {
  if (values.length < options.minDataPoints) return [];
  
  const anomalies: Anomaly[] = [];
  
  // Use 30-day rolling baseline
  for (let i = 30; i < values.length; i++) {
    const baseline = values.slice(i - 30, i).map(v => v.value);
    const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
    const stdDev = Math.sqrt(
      baseline.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / baseline.length
    );
    
    if (stdDev === 0) continue; // Skip if no variation
    
    const current = values[i];
    const zScore = (current.value - mean) / stdDev;
    
    if (Math.abs(zScore) > options.threshold) {
      const severity = Math.abs(zScore) > 4 ? 'critical' : 
                       Math.abs(zScore) > 3 ? 'warning' : 'info';
      
      anomalies.push({
        date: current.date,
        metric: metricName,
        value: current.value,
        expected: mean,
        deviation: zScore,
        severity,
        type: zScore > 0 ? 'spike' : 'drop',
        explanation: generateExplanation(current.date, zScore),
      });
    }
  }
  
  return anomalies;
}

// Percentage-based anomaly detection (intuitive)
export function detectAnomaliesPercentage(
  values: { date: Date; value: number }[],
  metricName: string,
  options = { spikeThreshold: 3.0, dropThreshold: 0.5 }
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  
  // Compare each day to 7-day moving average
  for (let i = 7; i < values.length; i++) {
    const weekAvg = values.slice(i - 7, i).reduce((a, b) => a + b.value, 0) / 7;
    
    if (weekAvg === 0) continue;
    
    const current = values[i];
    const ratio = current.value / weekAvg;
    
    if (ratio >= options.spikeThreshold) {
      anomalies.push({
        date: current.date,
        metric: metricName,
        value: current.value,
        expected: weekAvg,
        deviation: ratio,
        severity: ratio > 5 ? 'critical' : 'warning',
        type: 'spike',
        explanation: `${Math.round(ratio * 100)}% of weekly average`,
      });
    } else if (ratio <= options.dropThreshold) {
      anomalies.push({
        date: current.date,
        metric: metricName,
        value: current.value,
        expected: weekAvg,
        deviation: ratio,
        severity: ratio < 0.2 ? 'critical' : 'warning',
        type: 'drop',
        explanation: `Only ${Math.round(ratio * 100)}% of weekly average`,
      });
    }
  }
  
  return anomalies;
}

// Zero usage detection (churn risk)
export function detectZeroUsage(
  values: { date: Date; value: number }[],
  metricName: string,
  consecutiveDaysThreshold = 3
): Anomaly[] {
  const anomalies: Anomaly[] = [];
  let zeroStreak = 0;
  let streakStart: Date | null = null;
  
  // Need to have had usage before to detect zero anomaly
  const hadUsage = values.some(v => v.value > 0);
  if (!hadUsage) return [];
  
  for (let i = 0; i < values.length; i++) {
    if (values[i].value === 0) {
      if (zeroStreak === 0) streakStart = values[i].date;
      zeroStreak++;
      
      if (zeroStreak === consecutiveDaysThreshold) {
        const avgBeforeZero = values.slice(0, i).filter(v => v.value > 0)
          .reduce((sum, v) => sum + v.value, 0) / values.slice(0, i).filter(v => v.value > 0).length || 0;
        
        anomalies.push({
          date: streakStart!,
          metric: metricName,
          value: 0,
          expected: avgBeforeZero,
          deviation: -1,
          severity: 'critical',
          type: 'zero',
          explanation: `No usage for ${consecutiveDaysThreshold}+ consecutive days - potential churn risk`,
        });
      }
    } else {
      zeroStreak = 0;
      streakStart = null;
    }
  }
  
  return anomalies;
}

// Smart explanation generator
function generateExplanation(date: Date, zScore: number): string {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const month = date.getMonth();
  const dayOfMonth = date.getDate();
  
  if (zScore < -2) {
    // Drop explanations
    if (isWeekend) return 'Weekend - typically lower usage';
    if (month === 11 && dayOfMonth >= 24 && dayOfMonth <= 26) return 'Christmas period';
    if (month === 11 && dayOfMonth === 31) return "New Year's Eve";
    if (month === 0 && dayOfMonth === 1) return "New Year's Day";
    if (month === 6 && dayOfMonth === 4) return 'July 4th (US Holiday)';
    if (month === 10 && dayOfMonth >= 22 && dayOfMonth <= 28) return 'Thanksgiving week';
    return 'Unexpected drop - investigate';
  } else {
    // Spike explanations
    if (dayOfWeek === 1) return 'Monday spike - common after weekend';
    if (dayOfWeek === 5) return 'Friday spike - end of work week';
    return 'Unusual spike - may indicate campaign or viral event';
  }
}

// Main function to detect all anomalies for usage data
export function detectAllAnomalies(
  usage: UsageData,
  startDate: string,
  endDate: string
): Anomaly[] {
  const allAnomalies: Anomaly[] = [];
  
  // Metrics to check for anomalies
  const metricsToCheck = [
    { name: 'Total Transactions', keys: ['transactions_total', 'txn_total', 'transaction_total'] },
    { name: 'Replicated', keys: ['replicated', 'transaction_replicated'] },
    { name: 'Edge', keys: ['edge', 'transaction_edge'] },
    { name: 'Signals', keys: ['signals', 'transaction_signal'] },
    { name: 'Functions', keys: ['executions', 'transaction_xhr'] },
  ];
  
  for (const metric of metricsToCheck) {
    const values = extractDailyMetricValues(usage, metric.keys, startDate, endDate);
    
    // Skip if no data
    if (values.every(v => v.value === 0)) continue;
    
    // Run all detection methods
    const zScoreAnomalies = detectAnomaliesZScore(values, metric.name);
    const percentageAnomalies = detectAnomaliesPercentage(values, metric.name);
    const zeroAnomalies = detectZeroUsage(values, metric.name);
    
    allAnomalies.push(...zScoreAnomalies, ...percentageAnomalies, ...zeroAnomalies);
  }
  
  // Deduplicate anomalies (same metric and date)
  const uniqueAnomalies = allAnomalies.reduce((acc, anomaly) => {
    const key = `${anomaly.metric}-${anomaly.date.toISOString().split('T')[0]}`;
    const existing = acc.get(key);
    
    // Keep the most severe anomaly for each day/metric combination
    if (!existing || getSeverityValue(anomaly.severity) > getSeverityValue(existing.severity)) {
      acc.set(key, anomaly);
    }
    
    return acc;
  }, new Map<string, Anomaly>());
  
  // Sort by date (most recent first) and severity
  return Array.from(uniqueAnomalies.values()).sort((a, b) => {
    const dateDiff = b.date.getTime() - a.date.getTime();
    if (dateDiff !== 0) return dateDiff;
    return getSeverityValue(b.severity) - getSeverityValue(a.severity);
  });
}

function getSeverityValue(severity: 'info' | 'warning' | 'critical'): number {
  switch (severity) {
    case 'critical': return 3;
    case 'warning': return 2;
    case 'info': return 1;
    default: return 0;
  }
}
