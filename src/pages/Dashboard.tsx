import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import StatCard from '../components/cards/StatCard';
import TrendChart from '../components/charts/TrendChart';
import ApiBreakdownChart from '../components/charts/ApiBreakdownChart';
import TransactionTypeChart from '../components/charts/TransactionTypeChart';
import MetricsTable from '../components/tables/MetricsTable';
import AppBreakdownTable from '../components/tables/AppBreakdownTable';
import { Activity, Users, Zap, Server, Radio, Loader2, Code, MessageSquare } from 'lucide-react';
import { sumMetrics, formatNumber, processChartData, processFeatureData, processTransactionTypes } from '../utils/metrics';
import { METRIC_COLORS } from '../config/chartColors';

type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

// Determine which granularities are valid based on date range
function getValidGranularities(startDate: string, endDate: string): Set<TimeGranularity> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  
  const valid = new Set<TimeGranularity>();
  
  // Day: valid for ranges up to 90 days
  if (diffDays >= 1 && diffDays <= 90) {
    valid.add('day');
  }
  
  // Week: valid for ranges >= 7 days
  if (diffDays >= 7) {
    valid.add('week');
  }
  
  // Month: valid for ranges >= 1 month
  if (diffMonths >= 1) {
    valid.add('month');
  }
  
  // Quarter: valid for ranges >= 3 months
  if (diffMonths >= 3) {
    valid.add('quarter');
  }
  
  // Year: valid for ranges >= 12 months
  if (diffMonths >= 12) {
    valid.add('year');
  }
  
  return valid;
}

export default function Dashboard() {
  const {
    usage,
    fetchUsage,
    isLoadingUsage,
    selectedAccountId,
    selectedAppId,
    setSelectedAppId,
    selectedKeyId,
    startDate,
    endDate,
    apps,
  } = useAuth();

  const [granularity, setGranularity] = useState<TimeGranularity>('day');
  
  // Get valid granularities based on date range
  const validGranularities = getValidGranularities(startDate, endDate);

  // Auto-switch to valid granularity if current becomes invalid
  useEffect(() => {
    if (!validGranularities.has(granularity)) {
      // Select the first valid granularity in order of preference
      const preferredOrder: TimeGranularity[] = ['day', 'week', 'month', 'quarter', 'year'];
      const firstValid = preferredOrder.find(g => validGranularities.has(g));
      if (firstValid) {
        setGranularity(firstValid);
      }
    }
  }, [startDate, endDate, granularity, validGranularities]);

  // Fetch usage when selection changes
  useEffect(() => {
    if (selectedAccountId && (selectedAppId || selectedKeyId)) {
      fetchUsage();
    }
  }, [selectedAccountId, selectedAppId, selectedKeyId, startDate, endDate, fetchUsage]);

  // Calculate metrics - try multiple possible field names
  const totalTx = usage ? (
    sumMetrics(usage.transactions_total) || 
    sumMetrics(usage.txn_total) || 
    sumMetrics(usage.transaction_total)
  ) : 0;
  
  const repTx = usage ? (
    sumMetrics(usage.replicated) || 
    sumMetrics(usage.transaction_replicated)
  ) : 0;
  
  const edgeTx = usage ? (
    sumMetrics(usage.edge) || 
    sumMetrics(usage.transaction_edge)
  ) : 0;
  
  const sigTx = usage ? (
    sumMetrics(usage.signals) || 
    sumMetrics(usage.transaction_signal)
  ) : 0;
  
  const funcTx = usage ? (
    sumMetrics(usage.functions) ||
    sumMetrics(usage.executions) ||
    sumMetrics(usage.function_executions)
  ) : 0;
  
  const msgActionsTx = usage ? (
    sumMetrics(usage.message_actions) ||
    sumMetrics(usage.messageActions) ||
    sumMetrics(usage.actions)
  ) : 0;
  
  // Helper to get max value for MAU (cumulative metric)
  const getMaxValue = (metricData?: Record<string, any>): number => {
    if (!metricData || typeof metricData !== 'object') return 0;
    let maxValue = 0;
    for (const monthKey of Object.keys(metricData)) {
      const monthData = metricData[monthKey];
      if (monthData && typeof monthData === 'object' && monthData.days) {
        for (const dayValue of Object.values(monthData.days)) {
          if (typeof dayValue === 'number' && dayValue > maxValue) {
            maxValue = dayValue;
          }
        }
      }
    }
    return maxValue;
  };

  // MAU: prioritize fields that exist in the data (uuid, key_ip_ua, channel)
  const mau = usage ? (
    getMaxValue(usage.uuid) ||
    getMaxValue(usage.key_ip_ua) ||
    getMaxValue(usage.channel) ||
    getMaxValue(usage.mtd_uuid) || 
    getMaxValue(usage.pn_uuid) ||
    getMaxValue(usage.unique_users) ||
    getMaxValue(usage.mau) ||
    getMaxValue(usage.monthly_active_users) ||
    getMaxValue(usage.active_users)
  ) : 0;

  // Process chart data
  const chartData = usage ? processChartData(usage, startDate, endDate, granularity) : [];
  const featureData = usage ? processFeatureData(usage) : [];
  const txTypeData = usage ? processTransactionTypes(usage) : [];

  const hasSelection = selectedAccountId && (selectedAppId || selectedKeyId);

  return (
    <div className="h-screen bg-pn-bg flex overflow-hidden">
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        
        <main className="flex-1 p-6 overflow-y-auto">
          {!hasSelection ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-full bg-pn-surface flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-pn-text-secondary" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  Select an Account
                </h2>
                <p className="text-pn-text-secondary">
                  Enter a customer account ID in the sidebar, then select an app and keyset to view usage metrics.
                </p>
              </div>
            </div>
          ) : isLoadingUsage ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-pn-blue animate-spin mx-auto mb-4" />
                <p className="text-pn-text-secondary">Loading usage data...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* App/Keyset Breakdown (only show when viewing all apps/keys) */}
              {selectedAppId === 'all-apps' && apps.length > 0 && (
                <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Applications Breakdown
                  </h3>
                  <AppBreakdownTable
                    apps={apps}
                    selectedAppId={selectedAppId}
                    onSelectApp={setSelectedAppId}
                  />
                </div>
              )}

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                <StatCard
                  title="Total Transactions"
                  value={formatNumber(totalTx)}
                  icon={Activity}
                  color={METRIC_COLORS.total}
                />
                <StatCard
                  title="Replicated"
                  value={formatNumber(repTx)}
                  icon={Server}
                  color={METRIC_COLORS.replicated}
                />
                <StatCard
                  title="Edge"
                  value={formatNumber(edgeTx)}
                  icon={Zap}
                  color={METRIC_COLORS.edge}
                />
                <StatCard
                  title="Signals"
                  value={formatNumber(sigTx)}
                  icon={Radio}
                  color={METRIC_COLORS.signals}
                />
                <StatCard
                  title="Functions"
                  value={formatNumber(funcTx)}
                  icon={Code}
                  color={METRIC_COLORS.functions}
                />
                <StatCard
                  title="Message Actions"
                  value={formatNumber(msgActionsTx)}
                  icon={MessageSquare}
                  color={METRIC_COLORS.messageActions}
                />
                <StatCard
                  title="MAU"
                  value={formatNumber(mau)}
                  icon={Users}
                  color={METRIC_COLORS.mau}
                />
              </div>

              {/* Trend Chart with Granularity Selector */}
              <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Transaction Trends
                  </h3>
                  <div className="flex gap-1">
                    {(['day', 'week', 'month', 'quarter', 'year'] as TimeGranularity[]).map((g) => {
                      const isValid = validGranularities.has(g);
                      return (
                        <button
                          key={g}
                          onClick={() => isValid && setGranularity(g)}
                          disabled={!isValid}
                          className={`px-3 py-1.5 text-sm rounded transition-colors ${
                            granularity === g
                              ? 'bg-pn-blue text-white'
                              : isValid
                              ? 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                              : 'text-pn-text-secondary/30 cursor-not-allowed'
                          }`}
                        >
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <TrendChart data={chartData} granularity={granularity} />
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    API Feature Breakdown
                  </h3>
                  <ApiBreakdownChart data={featureData} />
                </div>
                <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Transaction Type Distribution
                  </h3>
                  <TransactionTypeChart data={txTypeData} />
                </div>
              </div>

              {/* Metrics Table */}
              <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
                <MetricsTable usage={usage} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
