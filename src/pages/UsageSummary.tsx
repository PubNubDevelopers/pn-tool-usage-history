import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { formatNumber } from '../utils/metrics';
import { Loader2, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';

interface KeysetUsage {
  keyId: number;
  keyName: string;
  monthlyData: Record<string, number>; // { 'YYYY-MM': total }
  totalUsage: number;
}

interface AppUsage {
  appId: number;
  appName: string;
  keysets: KeysetUsage[];
  totalUsage: number;
  expanded: boolean;
}

export default function UsageSummary() {
  const {
    selectedAccountId,
    apps,
    fetchKeys,
    startDate,
    endDate,
    session,
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [appUsageData, setAppUsageData] = useState<AppUsage[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Generate month labels for the past year
  const getMonthLabels = () => {
    const months: string[] = [];
    const end = new Date(endDate);
    const start = new Date(startDate);
    
    const current = new Date(start);
    while (current <= end) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  };

  const monthLabels = getMonthLabels();

  // Fetch usage for all apps and keys
  const fetchAllUsage = async () => {
    if (!selectedAccountId || !session?.token) {
      setError('Please select an account first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usageData: AppUsage[] = [];

      // Fetch usage for the entire account (aggregated view)
      const accountResponse = await fetch(
        `/api/key-usage?accountid=${selectedAccountId}&token=${session.token}&start=${startDate}&end=${endDate}`
      );
      
      if (!accountResponse.ok) {
        throw new Error('Failed to fetch account usage');
      }

      const accountUsage = await accountResponse.json();

      // For each app, aggregate the usage
      for (const app of apps) {
        const appUsage: AppUsage = {
          appId: app.id,
          appName: app.name,
          keysets: [],
          totalUsage: 0,
          expanded: false,
        };

        // Fetch keys for this app
        const keysResponse = await fetch(
          `/api/keys?appid=${app.id}&token=${session.token}`
        );

        if (keysResponse.ok) {
          const keys = await keysResponse.json();
          
          // Debug: log first key to see structure
          if (keys.length > 0) {
            console.log('Sample key structure:', keys[0]);
          }

          // For each key, fetch usage
          for (const key of keys) {
            const keyUsageResponse = await fetch(
              `/api/key-usage?keyid=${key.id}&token=${session.token}&start=${startDate}&end=${endDate}`
            );

            if (keyUsageResponse.ok) {
              const keyUsage = await keyUsageResponse.json();
              
              // Process monthly data
              const monthlyData: Record<string, number> = {};
              let keyTotal = 0;

              // Extract metrics and aggregate by month
              for (const [metricName, metricData] of Object.entries(keyUsage)) {
                if (typeof metricData !== 'object' || !metricData) continue;

                for (const [monthTimestamp, monthInfo] of Object.entries(metricData as Record<string, any>)) {
                  if (monthInfo && monthInfo.days) {
                    for (const [dayTimestamp, value] of Object.entries(monthInfo.days)) {
                      const date = new Date(parseInt(dayTimestamp) * 1000);
                      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                      
                      if (typeof value === 'number') {
                        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + value;
                        keyTotal += value;
                      }
                    }
                  }
                }
              }

              if (keyTotal > 0) {
                // Use the keyset name fields in priority order
                const keysetName = key.name || 
                                  key.keyset_name || 
                                  key.key_name || 
                                  key.properties?.name ||
                                  `Keyset ${key.id}`;
                
                appUsage.keysets.push({
                  keyId: key.id,
                  keyName: keysetName,
                  monthlyData,
                  totalUsage: keyTotal,
                });
                appUsage.totalUsage += keyTotal;
              }
            }
          }
        }

        if (appUsage.totalUsage > 0) {
          usageData.push(appUsage);
        }
      }

      // Sort by total usage (highest first)
      usageData.sort((a, b) => b.totalUsage - a.totalUsage);
      setAppUsageData(usageData);
    } catch (err: any) {
      console.error('Failed to fetch usage data:', err);
      setError(err.message || 'Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  };

  // Toggle app expansion
  const toggleApp = (appId: number) => {
    setAppUsageData(prev => 
      prev.map(app => 
        app.appId === appId ? { ...app, expanded: !app.expanded } : app
      )
    );
  };

  useEffect(() => {
    if (selectedAccountId && apps.length > 0) {
      fetchAllUsage();
    }
  }, [selectedAccountId, apps, startDate, endDate]);

  if (!selectedAccountId) {
    return (
      <div className="flex h-screen bg-pn-bg">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 overflow-auto p-6">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 text-pn-text-secondary mx-auto mb-4" />
                <p className="text-pn-text-secondary text-lg">
                  Select an account to view usage summary
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-pn-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Usage Summary</h1>
            <p className="text-pn-text-secondary">
              Monthly usage breakdown for all apps and keysets
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-pn-blue animate-spin" />
              <span className="ml-3 text-pn-text-secondary">Loading usage data...</span>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
              {error}
            </div>
          ) : appUsageData.length === 0 ? (
            <div className="text-center py-12 text-pn-text-secondary">
              No usage data found for the selected time period
            </div>
          ) : (
            <div className="bg-pn-surface rounded-lg border border-pn-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-pn-surface-light">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-pn-text-secondary sticky left-0 bg-pn-surface-light z-10">
                        App / Keyset
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-pn-text-secondary">
                        Total Usage
                      </th>
                      {monthLabels.map((month) => (
                        <th
                          key={month}
                          className="text-right px-4 py-3 text-sm font-medium text-pn-text-secondary whitespace-nowrap"
                        >
                          {new Date(month + '-01').toLocaleDateString('en-US', {
                            month: 'short',
                            year: '2-digit',
                          })}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {appUsageData.map((app) => (
                      <>
                        {/* App Row */}
                        <tr
                          key={`app-${app.appId}`}
                          className="border-t border-pn-border hover:bg-pn-surface-light transition-colors cursor-pointer"
                          onClick={() => toggleApp(app.appId)}
                        >
                          <td className="px-4 py-3 text-white font-medium sticky left-0 bg-pn-surface hover:bg-pn-surface-light z-10">
                            <div className="flex items-center gap-2">
                              {app.expanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                              <span>{app.appName}</span>
                              <span className="text-xs text-pn-text-secondary">
                                ({app.keysets.length} {app.keysets.length === 1 ? 'key' : 'keys'})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-white font-semibold">
                            {formatNumber(app.totalUsage)}
                          </td>
                          {monthLabels.map((month) => {
                            const monthTotal = app.keysets.reduce(
                              (sum, key) => sum + (key.monthlyData[month] || 0),
                              0
                            );
                            return (
                              <td
                                key={month}
                                className="px-4 py-3 text-right text-pn-text-secondary"
                              >
                                {monthTotal > 0 ? formatNumber(monthTotal) : '-'}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Keyset Rows (shown when expanded) */}
                        {app.expanded &&
                          app.keysets.map((keyset) => (
                            <tr
                              key={`key-${keyset.keyId}`}
                              className="border-t border-pn-border/50 bg-pn-bg hover:bg-pn-surface transition-colors"
                            >
                              <td className="px-4 py-2 text-pn-text-secondary text-sm sticky left-0 bg-pn-bg hover:bg-pn-surface z-10">
                                <div className="pl-8">{keyset.keyName}</div>
                              </td>
                              <td className="px-4 py-2 text-right text-white text-sm">
                                {formatNumber(keyset.totalUsage)}
                              </td>
                              {monthLabels.map((month) => (
                                <td
                                  key={month}
                                  className="px-4 py-2 text-right text-pn-text-secondary text-sm"
                                >
                                  {keyset.monthlyData[month]
                                    ? formatNumber(keyset.monthlyData[month])
                                    : '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
