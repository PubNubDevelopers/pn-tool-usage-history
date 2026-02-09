import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FolderOpen, Key, Loader2, ExternalLink, ArrowDownWideNarrow, SortAsc } from 'lucide-react';
import { formatNumber, getTimeRangeLabel, calculateUsageTotals } from '../../utils/metrics';

interface UsageSummary {
  transactions: number;
  mau: number;
}

export default function SelectionPanel() {
  const {
    selectedAccountId,
    selectedAccount,
    apps,
    selectedAppId,
    setSelectedAppId,
    keys,
    selectedKeyId,
    setSelectedKeyId,
    fetchApps,
    fetchKeys,
    isLoading,
    startDate,
    endDate,
    getCachedUsageForKey,
  } = useAuth();

  const [sortByUsage, setSortByUsage] = useState(true);
  const [appUsageSummaries] = useState<Record<number, UsageSummary>>({});
  const [keyUsageSummaries, setKeyUsageSummaries] = useState<Record<number, UsageSummary>>({});

  // Fetch apps when account is selected
  useEffect(() => {
    if (selectedAccountId) {
      fetchApps(selectedAccountId);
    }
  }, [selectedAccountId, fetchApps]);

  // Fetch keys when app is selected
  useEffect(() => {
    if (selectedAppId && selectedAppId !== 'all-apps' && typeof selectedAppId === 'number') {
      fetchKeys(selectedAppId);
    }
  }, [selectedAppId, fetchKeys]);

  // Update key usage summaries from cache
  useEffect(() => {
    const updateKeyUsageSummaries = () => {
      if (!keys.length || !startDate || !endDate) return;
      
      const summaries: Record<number, UsageSummary> = {};
      
      for (const key of keys) {
        try {
          const usageData = getCachedUsageForKey(key.id, startDate, endDate);
          
          if (usageData) {
            const totals = calculateUsageTotals(usageData);
            if (totals.transactions > 0 || totals.mau > 0) {
              summaries[key.id] = totals;
            }
          }
        } catch (err) {
          // Continue with next key
        }
      }
      
      setKeyUsageSummaries(summaries);
    };
    
    updateKeyUsageSummaries();
    const interval = setInterval(updateKeyUsageSummaries, 1000);
    return () => clearInterval(interval);
  }, [keys, startDate, endDate, getCachedUsageForKey]);

  const timeRangeLabel = startDate && endDate ? getTimeRangeLabel(startDate, endDate) : '';

  // Calculate totals for "All Applications"
  const allAppsTotal = Object.values(appUsageSummaries).reduce(
    (acc, summary) => ({
      transactions: acc.transactions + summary.transactions,
      mau: acc.mau + summary.mau,
    }),
    { transactions: 0, mau: 0 }
  );

  // Calculate totals for "All Key Sets"
  const allKeysTotal = Object.values(keyUsageSummaries).reduce(
    (acc, summary) => ({
      transactions: acc.transactions + summary.transactions,
      mau: acc.mau + summary.mau,
    }),
    { transactions: 0, mau: 0 }
  );

  // Sort apps
  const sortedApps = [...apps].sort((a, b) => {
    if (sortByUsage) {
      const aUsage = appUsageSummaries[a.id]?.transactions || 0;
      const bUsage = appUsageSummaries[b.id]?.transactions || 0;
      if (aUsage !== bUsage) return bUsage - aUsage;
      return a.name.localeCompare(b.name);
    } else {
      return a.name.localeCompare(b.name);
    }
  });

  // Sort keys
  const sortedKeys = [...keys].sort((a, b) => {
    if (sortByUsage) {
      const aUsage = keyUsageSummaries[a.id]?.transactions || 0;
      const bUsage = keyUsageSummaries[b.id]?.transactions || 0;
      if (aUsage !== bUsage) return bUsage - aUsage;
      const aName = a.properties?.name || `Key ${a.id}`;
      const bName = b.properties?.name || `Key ${b.id}`;
      return aName.localeCompare(bName);
    } else {
      const aName = a.properties?.name || `Key ${a.id}`;
      const bName = b.properties?.name || `Key ${b.id}`;
      return aName.localeCompare(bName);
    }
  });

  if (!selectedAccountId) {
    return null;
  }

  return (
    <aside className="w-64 bg-pn-surface border-r border-pn-border flex flex-col h-full overflow-hidden">
      {/* Account Summary */}
      {selectedAccount && (
        <div className="p-4 border-b border-pn-border">
          <div className="text-xs text-pn-text-secondary uppercase tracking-wider mb-2">
            Current Account
          </div>
          <div className="space-y-1">
            <p className="font-medium text-white text-sm truncate" title={selectedAccount.properties?.company || selectedAccount.email}>
              {selectedAccount.properties?.company || selectedAccount.email}
            </p>
            <a
              href={`https://internal-admin.pubnub.com/account/${selectedAccount.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-pn-blue hover:text-blue-400 transition-colors"
              title="Open in Admin Portal"
            >
              <span>ID: {selectedAccount.id}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            {selectedAccount.email !== (selectedAccount.properties?.company || selectedAccount.email) && (
              <p className="text-xs text-pn-text-secondary truncate" title={selectedAccount.email}>
                {selectedAccount.email}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Apps List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && apps.length === 0 && (
          <div className="p-4 text-center text-pn-text-secondary">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading apps...</p>
          </div>
        )}
        
        {!isLoading && apps.length === 0 && selectedAccountId && (
          <div className="p-4 text-center text-pn-text-secondary">
            <FolderOpen className="w-5 h-5 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No apps found</p>
          </div>
        )}
        
        {apps.length > 0 && (
          <div className="p-4 border-b border-pn-border">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-pn-text-secondary uppercase tracking-wider">
                <FolderOpen className="w-3 h-3 inline mr-1" />
                Apps ({apps.length})
              </label>
              <div className="flex items-center gap-2">
                {timeRangeLabel && (
                  <span className="text-xs text-pn-text-secondary">{timeRangeLabel}</span>
                )}
                <button
                  onClick={() => setSortByUsage(!sortByUsage)}
                  className="p-1 text-pn-text-secondary hover:text-white transition-colors"
                  title={sortByUsage ? 'Sort by name' : 'Sort by usage'}
                >
                  {sortByUsage ? (
                    <ArrowDownWideNarrow className="w-3 h-3" />
                  ) : (
                    <SortAsc className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-auto">
              <button
                onClick={() => {
                  setSelectedAppId('all-apps');
                  setSelectedKeyId('all-keys');
                }}
                className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center justify-between gap-2 ${
                  selectedAppId === 'all-apps'
                    ? 'bg-pn-blue text-white'
                    : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                }`}
              >
                <span>All Applications</span>
                {(allAppsTotal.transactions > 0 || allAppsTotal.mau > 0) && (
                  <span className="text-xs whitespace-nowrap opacity-70 flex-shrink-0">
                    {formatNumber(allAppsTotal.transactions)} / {formatNumber(allAppsTotal.mau)}
                  </span>
                )}
              </button>
              {sortedApps.map((app) => {
                const usageSummary = appUsageSummaries[app.id];
                return (
                  <button
                    key={app.id}
                    onClick={() => setSelectedAppId(app.id)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center justify-between gap-2 ${
                      selectedAppId === app.id
                        ? 'bg-pn-blue text-white'
                        : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                    }`}
                  >
                    <span className="truncate" title={app.name}>
                      {app.name}
                    </span>
                    {usageSummary && (
                      <span className="text-xs whitespace-nowrap opacity-70 flex-shrink-0">
                        {formatNumber(usageSummary.transactions)} / {formatNumber(usageSummary.mau)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Keys List */}
        {selectedAppId && selectedAppId !== 'all-apps' && keys.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-pn-text-secondary uppercase tracking-wider">
                <Key className="w-3 h-3 inline mr-1" />
                Keys ({keys.length})
              </label>
              <div className="flex items-center gap-2">
                {timeRangeLabel && (
                  <span className="text-xs text-pn-text-secondary">{timeRangeLabel}</span>
                )}
                <button
                  onClick={() => setSortByUsage(!sortByUsage)}
                  className="p-1 text-pn-text-secondary hover:text-white transition-colors"
                  title={sortByUsage ? 'Sort by name' : 'Sort by usage'}
                >
                  {sortByUsage ? (
                    <ArrowDownWideNarrow className="w-3 h-3" />
                  ) : (
                    <SortAsc className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-auto">
              <button
                onClick={() => setSelectedKeyId('all-keys')}
                className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center justify-between gap-2 ${
                  selectedKeyId === 'all-keys'
                    ? 'bg-pn-blue text-white'
                    : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                }`}
              >
                <span>All Key Sets</span>
                {(allKeysTotal.transactions > 0 || allKeysTotal.mau > 0) && (
                  <span className="text-xs whitespace-nowrap opacity-70 flex-shrink-0">
                    {formatNumber(allKeysTotal.transactions)} / {formatNumber(allKeysTotal.mau)}
                  </span>
                )}
              </button>
              {sortedKeys.map((key) => {
                const usageSummary = keyUsageSummaries[key.id];
                return (
                  <button
                    key={key.id}
                    onClick={() => setSelectedKeyId(key.id)}
                    className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center justify-between gap-2 ${
                      selectedKeyId === key.id
                        ? 'bg-pn-blue text-white'
                        : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                    }`}
                  >
                    <span className="truncate" title={key.properties?.name || `Key ${key.id}`}>
                      {key.properties?.name || `Key ${key.id}`}
                    </span>
                    {usageSummary && (
                      <span className="text-xs whitespace-nowrap opacity-70 flex-shrink-0">
                        {formatNumber(usageSummary.transactions)} / {formatNumber(usageSummary.mau)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
