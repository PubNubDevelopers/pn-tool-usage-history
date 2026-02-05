import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { formatNumber } from '../utils/metrics';
import { Loader2, ChevronDown, ChevronRight, TrendingUp, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    startDate,
    endDate,
    session,
    fetchUsageForKey,
    getCachedUsageForKey,
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
    if (!selectedAccountId) {
      setError('Please select an account first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const usageData: AppUsage[] = [];


      // For each app, aggregate the usage
      for (const app of apps) {
        const appUsage: AppUsage = {
          appId: app.id,
          appName: app.name,
          keysets: [],
          totalUsage: 0,
          expanded: false,
        };

        // Fetch keys for this app (this will be cached if already fetched)
        const keysResponse = await fetch(
          `/api/keys?appid=${app.id}&token=${session?.token}`
        );

        if (keysResponse.ok) {
          const keys = await keysResponse.json();

          // For each key, fetch usage with caching
          for (const key of keys) {
            try {
              // Check cache first, then fetch if needed
              let keyUsage = getCachedUsageForKey(key.id, startDate, endDate);
              
              if (!keyUsage) {
                // Not cached, fetch from API
                keyUsage = await fetchUsageForKey(key.id, startDate, endDate);
              }
              
              // Process monthly data
              const monthlyData: Record<string, number> = {};
              let keyTotal = 0;

              // Extract metrics and aggregate by month
              for (const metricData of Object.values(keyUsage)) {
                if (typeof metricData !== 'object' || !metricData) continue;

                for (const monthInfo of Object.values(metricData as Record<string, any>)) {
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
            } catch (err) {
              // Continue with next key
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

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    // Title
    doc.setFontSize(18);
    doc.setTextColor(231, 76, 60); // PubNub red
    doc.text('PubNub Usage Summary Report', 14, 15);

    // Account info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Account ID: ${selectedAccountId}`, 14, 22);
    doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 14, 27);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    // Calculate totals
    const grandTotal = appUsageData.reduce((sum, app) => sum + app.totalUsage, 0);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total Usage: ${formatNumber(grandTotal)}`, 14, 40);

    // Prepare table data
    const tableData: any[] = [];
    
    appUsageData.forEach(app => {
      // Add app row
      const appRow = [
        app.appName,
        formatNumber(app.totalUsage),
        ...monthLabels.map(month => {
          const monthTotal = app.keysets.reduce(
            (sum, key) => sum + (key.monthlyData[month] || 0),
            0
          );
          return monthTotal > 0 ? formatNumber(monthTotal) : '-';
        })
      ];
      tableData.push(appRow);

      // Add keyset rows
      app.keysets.forEach(keyset => {
        // Remove "% %" prefix from keyset name if it exists
        const cleanKeysetName = keyset.keyName.replace(/^%\s*%\s*/g, '').trim();
        const keysetRow = [
          `  └─ ${cleanKeysetName}`,
          formatNumber(keyset.totalUsage),
          ...monthLabels.map(month => 
            keyset.monthlyData[month] ? formatNumber(keyset.monthlyData[month]) : '-'
          )
        ];
        tableData.push(keysetRow);
      });
    });

    // Create table
    autoTable(doc, {
      startY: 45,
      head: [[
        'App / Keyset',
        'Total',
        ...monthLabels.map(month => 
          new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        )
      ]],
      body: tableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [231, 76, 60], // PubNub red
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        ...Object.fromEntries(
          [...Array(monthLabels.length + 1)].map((_, i) => [i + 1, { halign: 'right' }])
        ),
      },
      didParseCell: (data) => {
        // Style app rows (no indent)
        if (data.section === 'body' && data.column.index === 0) {
          if (!data.cell.text[0].startsWith('  └─')) {
            data.cell.styles.fillColor = [245, 245, 245];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [100, 100, 100];
          }
        }
      },
    });

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    const filename = `pubnub-usage-summary-${selectedAccountId}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  useEffect(() => {
    if (selectedAccountId && apps.length > 0) {
      fetchAllUsage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, apps, startDate, endDate]);

  if (!selectedAccountId) {
    return (
      <div className="h-screen bg-pn-bg flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-screen overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
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
    <div className="h-screen bg-pn-bg flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Usage Summary</h1>
              <p className="text-pn-text-secondary">
                Monthly usage breakdown for all apps and keysets
              </p>
            </div>
            {appUsageData.length > 0 && (
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-pn-blue hover:bg-pn-blue-hover text-white rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                Export to PDF
              </button>
            )}
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
