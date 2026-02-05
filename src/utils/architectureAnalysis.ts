import { UsageData, ArchitectureIssue } from '../types';
import { sumMetrics, formatNumber } from './metrics';

interface AnalysisMetrics {
  total: number;
  replicated: number;
  edge: number;
  signals: number;
  publish: number;
  subscribe: number;
  presence: number;
  presenceHeartbeats: number;
  history: number;
  accessManagerGrants: number;
  accessManagerAudits: number;
  messageActions: number;
  functions: number;
  push: number;
  files: number;
  mau: number;
}

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

// Get maximum value from a metric (for MAU which is cumulative)
function getMaxMetricValue(metricData?: Record<string, any>): number {
  if (!metricData || typeof metricData !== 'object') return 0;

  let maxValue = 0;
  
  for (const monthKey of Object.keys(metricData)) {
    const monthData = metricData[monthKey];
    if (monthData?.days) {
      for (const dayValue of Object.values(monthData.days)) {
        if (typeof dayValue === 'number' && dayValue > maxValue) {
          maxValue = dayValue;
        }
      }
    }
  }
  
  return maxValue;
}

// Extract metrics from usage data
function extractMetrics(usage: UsageData): AnalysisMetrics {
  return {
    total: sumMultipleMetrics(usage, 'transactions_total', 'txn_total', 'transaction_total'),
    replicated: sumMultipleMetrics(usage, 'replicated', 'transaction_replicated', 'txn_replicated'),
    edge: sumMultipleMetrics(usage, 'edge', 'transaction_edge', 'txn_edge'),
    signals: sumMultipleMetrics(usage, 'signals', 'transaction_signal', 'txn_signal'),
    publish: sumMultipleMetrics(usage, 'publish', 'transaction_publish', 'publish_ssl', 'publish_non_ssl'),
    subscribe: sumMultipleMetrics(usage, 'subscribe', 'transaction_subscribe', 'subscribe_msgs'),
    presence: sumMultipleMetrics(usage, 'pres_pub', 'transaction_presence_herenow', 'transaction_presence_wherenow'),
    presenceHeartbeats: sumMultipleMetrics(usage, 'transaction_presence_heartbeats'),
    history: sumMultipleMetrics(usage, 'history', 'transaction_history', 'history_msgs'),
    accessManagerGrants: sumMultipleMetrics(usage, 'transaction_accessmanager_grants', 'accessmanager_grants_transactions'),
    accessManagerAudits: sumMultipleMetrics(usage, 'transaction_accessmanager_audits', 'accessmanager_audits_transactions'),
    messageActions: sumMultipleMetrics(usage, 'message_actions', 'transaction_message_actions_add'),
    functions: sumMultipleMetrics(usage, 'executions', 'transaction_xhr'),
    push: sumMultipleMetrics(usage, 'transaction_apns_sent', 'transaction_fcm_sent', 'push'),
    files: sumMultipleMetrics(usage, 'transaction_files_publish', 'transaction_files_get_file'),
    mau: getMaxMetricValue(usage.uuid) ||
         getMaxMetricValue(usage.key_ip_ua) ||
         getMaxMetricValue(usage.channel) ||
         getMaxMetricValue(usage.mtd_uuid) || 
         getMaxMetricValue(usage.pn_uuid) || 
         getMaxMetricValue(usage.unique_users) ||
         getMaxMetricValue(usage.mau) ||
         getMaxMetricValue(usage.monthly_active_users) ||
         getMaxMetricValue(usage.active_users),
  };
}

// Architecture rules - each returns an issue or null
type ArchitectureRule = (m: AnalysisMetrics) => ArchitectureIssue | null;

const RULES: ArchitectureRule[] = [
  // Cost: High replicated, no edge
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.total === 0) return null;
    const ratio = m.replicated / m.total;
    if (ratio > 0.8 && m.edge === 0) {
      return {
        id: 'high-replicated-no-edge',
        category: 'cost',
        severity: 'high',
        title: 'Not Using Edge Transactions',
        description: `${Math.round(ratio * 100)}% of transactions are replicated globally. Edge transactions can reduce costs for regional-only messages.`,
        currentValue: `${formatNumber(m.replicated)} replicated, ${formatNumber(m.edge)} edge`,
        recommendation: 'Use Edge transactions for messages that only need regional delivery (e.g., typing indicators, local events) to reduce costs by 60-80%.',
        potentialImpact: 'Significant cost reduction',
        effort: 'low',
      };
    }
    return null;
  },
  
  // Cost: High publish, no signals
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.publish < 100000 || m.signals > 0) return null;
    return {
      id: 'high-publish-no-signals',
      category: 'cost',
      severity: 'medium',
      title: 'Consider Signals for Lightweight Messages',
      description: `High publish volume (${formatNumber(m.publish)}) but no signals usage. Signals are ideal for typing indicators, read receipts, and ephemeral events.`,
      currentValue: `${formatNumber(m.publish)} publishes, 0 signals`,
      recommendation: 'Signals are 1/10th the cost of publishes. Use them for messages that don\'t need persistence or delivery guarantees.',
      potentialImpact: 'Up to 90% cost reduction for ephemeral messages',
      effort: 'medium',
    };
  },
  
  // Performance: High presence ratio
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.total === 0) return null;
    const presenceTotal = m.presence + m.presenceHeartbeats;
    const ratio = presenceTotal / m.total;
    if (ratio > 0.3) {
      return {
        id: 'high-presence-ratio',
        category: 'performance',
        severity: 'high',
        title: 'High Presence Transaction Ratio',
        description: `Presence accounts for ${Math.round(ratio * 100)}% of total transactions. This often indicates inefficient presence configuration.`,
        currentValue: `${formatNumber(presenceTotal)} presence transactions (${Math.round(ratio * 100)}%)`,
        recommendation: 'Increase heartbeat interval (default 300s is often sufficient). Consider using presence webhooks for server-side presence instead of client heartbeats.',
        potentialImpact: 'Could reduce presence costs by 50-75%',
        effort: 'low',
      };
    }
    return null;
  },
  
  // Security: No Access Manager
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.total < 10000 || m.accessManagerGrants > 0) return null;
    return {
      id: 'no-access-manager',
      category: 'security',
      severity: 'high',
      title: 'Access Manager Not Enabled',
      description: 'No Access Manager grants detected. Channels may be publicly accessible without authentication.',
      currentValue: 'No grants issued',
      recommendation: 'Enable Access Manager to control who can publish, subscribe, and access presence on channels. Use short-lived tokens with appropriate permissions.',
      potentialImpact: 'Critical security improvement',
      effort: 'medium',
    };
  },
  
  // Performance: High AM audits
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.accessManagerGrants === 0) return null;
    const ratio = m.accessManagerAudits / m.accessManagerGrants;
    if (ratio > 10) {
      return {
        id: 'high-am-audits',
        category: 'performance',
        severity: 'medium',
        title: 'Excessive Access Manager Audits',
        description: `Audit to grant ratio is ${Math.round(ratio)}:1. Frequent audits suggest clients may be re-checking permissions unnecessarily.`,
        currentValue: `${formatNumber(m.accessManagerAudits)} audits / ${formatNumber(m.accessManagerGrants)} grants`,
        recommendation: 'Cache tokens client-side and avoid frequent permission checks. Use token expiration appropriately.',
        potentialImpact: 'Reduced latency and API overhead',
        effort: 'low',
      };
    }
    return null;
  },
  
  // Reliability: No persistence
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.publish < 100000 || m.history > 0) return null;
    return {
      id: 'no-persistence',
      category: 'reliability',
      severity: 'low',
      title: 'No Message Persistence',
      description: `High publish volume (${formatNumber(m.publish)}) but no history/storage usage. Messages are not persisted for offline delivery or history.`,
      currentValue: `${formatNumber(m.publish)} publishes, 0 history fetches`,
      recommendation: 'Consider enabling message persistence for chat applications to support message history and offline message delivery.',
      potentialImpact: 'Improved user experience for reconnecting clients',
      effort: 'low',
    };
  },
  
  // Performance: High history fetch rate
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.history === 0 || m.mau === 0) return null;
    const perUser = m.history / m.mau;
    if (perUser > 100) {
      return {
        id: 'high-history-fetch',
        category: 'performance',
        severity: 'medium',
        title: 'High History Fetch Rate',
        description: `${Math.round(perUser)} history fetches per MAU suggests clients may be over-fetching message history.`,
        currentValue: `${formatNumber(m.history)} history calls / ${formatNumber(m.mau)} MAU = ${Math.round(perUser)} per user`,
        recommendation: 'Implement client-side message caching. Fetch history only on initial load, not on every reconnect. Use pagination appropriately.',
        potentialImpact: 'Reduced latency and API costs',
        effort: 'medium',
      };
    }
    return null;
  },
  
  // Scalability: Extreme fan-out
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.publish === 0) return null;
    const ratio = m.subscribe / m.publish;
    if (ratio > 100) {
      return {
        id: 'extreme-fanout',
        category: 'scalability',
        severity: 'medium',
        title: 'Extreme Fan-Out Pattern',
        description: `Subscribe to publish ratio is ${Math.round(ratio)}:1, indicating extreme fan-out or broadcast pattern.`,
        currentValue: `${formatNumber(m.subscribe)} subscribes / ${formatNumber(m.publish)} publishes = ${Math.round(ratio)}:1`,
        recommendation: 'Review channel architecture. Consider using channel groups for broadcast scenarios. Ensure clients aren\'t subscribing to unnecessary channels.',
        potentialImpact: 'Improved scalability and reduced client overhead',
        effort: 'high',
      };
    }
    return null;
  },
  
  // Cost: High functions ratio
  (m: AnalysisMetrics): ArchitectureIssue | null => {
    if (m.functions === 0) return null;
    const functionsRatio = m.functions / (m.publish || 1);
    if (functionsRatio > 2) {
      return {
        id: 'high-functions-ratio',
        category: 'scalability',
        severity: 'low',
        title: 'High Functions to Publish Ratio',
        description: `Functions executions (${formatNumber(m.functions)}) significantly exceed publishes (${formatNumber(m.publish)}).`,
        currentValue: `${Math.round(functionsRatio)}:1 functions to publish ratio`,
        recommendation: 'Review Function triggers. Consider batching operations or using webhooks for less time-sensitive processing.',
        potentialImpact: 'Reduced Functions costs',
        effort: 'medium',
      };
    }
    return null;
  },
];

// Run all rules and return issues
export function runArchitectureAnalysis(usage: UsageData): ArchitectureIssue[] {
  const metrics = extractMetrics(usage);
  const issues: ArchitectureIssue[] = [];
  
  for (const rule of RULES) {
    const issue = rule(metrics);
    if (issue) issues.push(issue);
  }
  
  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return issues;
}

// Calculate overall architecture score
export function calculateArchitectureScore(issues: ArchitectureIssue[]): number {
  const penalties = { high: 20, medium: 10, low: 5 };
  const totalPenalty = issues.reduce((sum, issue) => sum + penalties[issue.severity], 0);
  return Math.max(0, 100 - totalPenalty);
}
