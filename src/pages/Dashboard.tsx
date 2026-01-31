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
import { Activity, Users, Zap, Server, Radio, Loader2 } from 'lucide-react';
import { sumMetrics, formatNumber, processChartData, processFeatureData, processTransactionTypes } from '../utils/metrics';

type TimeGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';

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
  
  const mau = usage ? (
    sumMetrics(usage.mtd_uuid) || 
    sumMetrics(usage.pn_uuid)
  ) : 0;

  // Debug: log what metrics we actually have
  useEffect(() => {
    if (usage) {
      console.log('Available metrics:', Object.keys(usage));
      console.log('Sample metric structure:', Object.entries(usage)[0]);
    }
  }, [usage]);

  // Process chart data
  const chartData = usage ? processChartData(usage, startDate, endDate, granularity) : [];
  const featureData = usage ? processFeatureData(usage) : [];
  const txTypeData = usage ? processTransactionTypes(usage) : [];

  const hasSelection = selectedAccountId && (selectedAppId || selectedKeyId);

  return (
    <div className="min-h-screen bg-pn-bg flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                  title="Monthly Active Users"
                  value={formatNumber(mau)}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Total Transactions"
                  value={formatNumber(totalTx)}
                  icon={Activity}
                  color="green"
                />
                <StatCard
                  title="Replicated"
                  value={formatNumber(repTx)}
                  icon={Server}
                  color="purple"
                />
                <StatCard
                  title="Edge"
                  value={formatNumber(edgeTx)}
                  icon={Zap}
                  color="yellow"
                />
                <StatCard
                  title="Signals"
                  value={formatNumber(sigTx)}
                  icon={Radio}
                  color="pink"
                />
              </div>

              {/* Trend Chart with Granularity Selector */}
              <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Transaction Trends
                  </h3>
                  <div className="flex gap-1">
                    {(['day', 'week', 'month', 'quarter', 'year'] as TimeGranularity[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={`px-3 py-1.5 text-sm rounded transition-colors ${
                          granularity === g
                            ? 'bg-pn-blue text-white'
                            : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                        }`}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </button>
                    ))}
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
