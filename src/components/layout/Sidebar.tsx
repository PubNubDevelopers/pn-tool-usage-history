import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, FolderOpen, Key, LogOut, Loader2, Search, X, BarChart3, TrendingUp, ArrowDownWideNarrow, SortAsc, Lightbulb, CheckSquare } from 'lucide-react';
import { formatNumber, getTimeRangeLabel, calculateUsageTotals } from '../../utils/metrics';
import { UsageData } from '../../types';

interface UsageSummary {
  transactions: number;
  mau: number;
}

export default function Sidebar() {
  const {
    logout,
    session,
    accounts,
    searchResults,
    searchAccounts,
    clearSearchResults,
    selectedAccountId,
    setSelectedAccountId,
    apps,
    selectedAppId,
    setSelectedAppId,
    fetchApps,
    keys,
    selectedKeyId,
    setSelectedKeyId,
    fetchKeys,
    isLoading,
    startDate,
    endDate,
    fetchUsageForKey,
    getCachedUsageForKey,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchEmail, setSearchEmail] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [sortByUsage, setSortByUsage] = useState(true); // true = by usage, false = by name
  
  // Store usage summaries for apps and keys
  const [appUsageSummaries, setAppUsageSummaries] = useState<Record<number, UsageSummary>>({});
  const [keyUsageSummaries, setKeyUsageSummaries] = useState<Record<number, UsageSummary>>({});

  // Load search history on mount
  useEffect(() => {
    const history = localStorage.getItem('pn_search_history');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (err) {
        console.error('Failed to load search history:', err);
      }
    }
  }, []);

  // Save email to search history
  const saveToHistory = (email: string) => {
    const history = searchHistory.filter(e => e !== email);
    const newHistory = [email, ...history].slice(0, 10); // Keep last 10 searches
    setSearchHistory(newHistory);
    localStorage.setItem('pn_search_history', JSON.stringify(newHistory));
  };

  // Remove from search history
  const removeFromHistory = (email: string) => {
    const newHistory = searchHistory.filter(e => e !== email);
    setSearchHistory(newHistory);
    localStorage.setItem('pn_search_history', JSON.stringify(newHistory));
  };

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

  // Update key usage summaries from cache whenever keys change or data is fetched
  useEffect(() => {
    const updateKeyUsageSummaries = () => {
      if (!keys.length || !startDate || !endDate) return;
      
      const summaries: Record<number, UsageSummary> = {};
      
      for (const key of keys) {
        try {
          // Only check cache - don't fetch
          const usageData = getCachedUsageForKey(key.id, startDate, endDate);
          
          if (usageData) {
            const totals = calculateUsageTotals(usageData);
            if (totals.transactions > 0 || totals.mau > 0) {
              summaries[key.id] = totals;
            }
          }
        } catch (err) {
          console.error(`Failed to calculate usage for key ${key.id}:`, err);
        }
      }
      
      setKeyUsageSummaries(summaries);
    };
    
    // Update immediately
    updateKeyUsageSummaries();
    
    // Also set up interval to check for cache updates
    const interval = setInterval(updateKeyUsageSummaries, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, startDate, endDate]);

  // Don't proactively fetch keys for all apps - it causes too many requests
  // Instead, summaries will only show for the currently selected app's keys
  // Users can still select "All Applications" to see aggregate data

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
  const timeRangeLabel = startDate && endDate ? getTimeRangeLabel(startDate, endDate) : '';

  // Calculate totals for "All Applications" - sum of all child nodes
  const allAppsTotal = Object.values(appUsageSummaries).reduce(
    (acc, summary) => ({
      transactions: acc.transactions + summary.transactions,
      mau: acc.mau + summary.mau, // Sum MAU across apps
    }),
    { transactions: 0, mau: 0 }
  );

  // Calculate totals for "All Key Sets" in current app - sum of all child nodes
  const allKeysTotal = Object.values(keyUsageSummaries).reduce(
    (acc, summary) => ({
      transactions: acc.transactions + summary.transactions,
      mau: acc.mau + summary.mau, // Sum MAU across key sets
    }),
    { transactions: 0, mau: 0 }
  );

  // Sort apps based on preference
  const sortedApps = [...apps].sort((a, b) => {
    if (sortByUsage) {
      // Sort by transactions desc, then by name
      const aUsage = appUsageSummaries[a.id]?.transactions || 0;
      const bUsage = appUsageSummaries[b.id]?.transactions || 0;
      if (aUsage !== bUsage) {
        return bUsage - aUsage; // Descending
      }
      return a.name.localeCompare(b.name); // Then by name
    } else {
      // Sort by name only
      return a.name.localeCompare(b.name);
    }
  });

  // Sort keys based on preference
  const sortedKeys = [...keys].sort((a, b) => {
    if (sortByUsage) {
      // Sort by transactions desc, then by name
      const aUsage = keyUsageSummaries[a.id]?.transactions || 0;
      const bUsage = keyUsageSummaries[b.id]?.transactions || 0;
      if (aUsage !== bUsage) {
        return bUsage - aUsage; // Descending
      }
      const aName = a.properties?.name || `Key ${a.id}`;
      const bName = b.properties?.name || `Key ${b.id}`;
      return aName.localeCompare(bName); // Then by name
    } else {
      // Sort by name only
      const aName = a.properties?.name || `Key ${a.id}`;
      const bName = b.properties?.name || `Key ${b.id}`;
      return aName.localeCompare(bName);
    }
  });

  return (
    <aside className="w-72 bg-pn-surface border-r border-pn-border flex flex-col h-screen overflow-hidden">
      {/* Logo */}
      <div className="p-4 border-b border-pn-border">
        <div className="flex items-center gap-2">
          <svg
            className="w-8 h-8"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="40" height="40" rx="8" fill="#cd2026" />
            <path
              d="M12 14h6c2.2 0 4 1.8 4 4s-1.8 4-4 4h-6v-8zm2 6h4c1.1 0 2-.9 2-2s-.9-2-2-2h-4v4z"
              fill="white"
            />
            <path d="M12 22h2v6h-2v-6z" fill="white" />
            <path d="M24 14h2l6 8v-8h2v14h-2l-6-8v8h-2V14z" fill="white" />
          </svg>
          <div>
            <span className="text-lg font-bold text-white">PubNub</span>
            <p className="text-xs text-pn-text-secondary">Account Usage</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-4 py-3 border-b border-pn-border">
        <nav className="space-y-1">
          <button
            onClick={() => navigate('/usage-summary')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
              location.pathname === '/usage-summary'
                ? 'bg-pn-blue text-white'
                : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Usage Summary</span>
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-pn-blue text-white'
                : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">Detailed View</span>
          </button>
          <button
            onClick={() => navigate('/insights')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
              location.pathname === '/insights'
                ? 'bg-pn-blue text-white'
                : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            <span className="text-sm font-medium">Insights</span>
          </button>
          <button
            onClick={() => navigate('/features')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded transition-colors ${
              location.pathname === '/features'
                ? 'bg-pn-blue text-white'
                : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span className="text-sm font-medium">Features</span>
          </button>
        </nav>
      </div>

      {/* Account Search & Selection */}
      <div className="p-4 border-b border-pn-border">
        <label className="block text-sm font-medium text-pn-text-secondary mb-2">
          <Building2 className="w-4 h-4 inline mr-1" />
          Customer Account
        </label>

        {/* Accounts dropdown - always visible */}
        {accounts.length > 0 && (
          <select
            value={selectedAccountId || ''}
            onChange={(e) => setSelectedAccountId(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 text-sm rounded bg-pn-bg border border-pn-border text-white focus:outline-none focus:border-pn-blue mb-2"
          >
            <option value="">Your accounts...</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.properties?.company || account.email || `Account ${account.id}`}
              </option>
            ))}
          </select>
        )}

        {/* Selected account details */}
        {selectedAccount && (
          <div className="mt-2 p-2 bg-pn-bg rounded text-xs text-pn-text-secondary">
            <p className="font-medium text-white truncate">
              {selectedAccount.properties?.company || selectedAccount.email}
            </p>
            <p>ID: {selectedAccount.id}</p>
            <p className="truncate">{selectedAccount.email}</p>
          </div>
        )}

        {/* Email/Domain search section with divider */}
        <div className="mt-4 pt-4 border-t border-pn-border">
          <p className="text-xs text-pn-text-secondary mb-2">Search by Email or Domain</p>

          {/* Search form - always visible */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchEmail) {
                saveToHistory(searchEmail);
                searchAccounts(searchEmail);
              }
            }}
            className="space-y-2"
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pn-text-secondary" />
                <input
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  type="text"
                  placeholder="email@domain.com or domain.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded bg-pn-bg border border-pn-border text-white placeholder-gray-500 focus:outline-none focus:border-pn-blue"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !searchEmail}
                className="px-3 py-2 bg-pn-blue hover:bg-blue-600 text-white text-sm rounded transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </div>
          </form>

          {/* Search History - always visible when history exists */}
          {searchHistory.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-pn-text-secondary mb-1">Recent Searches:</p>
              <div className="space-y-1 max-h-40 overflow-auto">
                {searchHistory.map((email, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-2 py-1.5 bg-pn-bg rounded hover:bg-pn-surface-light transition-colors group"
                  >
                    <button
                      onClick={() => {
                        setSearchEmail(email);
                        saveToHistory(email);
                        searchAccounts(email);
                      }}
                      className="flex-1 text-left text-sm text-pn-text-secondary hover:text-white truncate"
                      title={email}
                    >
                      {email}
                    </button>
                    <button
                      onClick={() => removeFromHistory(email)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
                      title="Remove from history"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-auto space-y-1">
              {searchResults.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setSelectedAccountId(account.id);
                    clearSearchResults();
                    setSearchEmail('');
                  }}
                  className="w-full text-left px-3 py-2 text-sm rounded bg-pn-surface-light hover:bg-pn-border text-white transition-colors"
                >
                  <p className="font-medium truncate">
                    {account.properties?.company || account.email || `Account ${account.id}`}
                  </p>
                  <p className="text-xs text-pn-text-secondary truncate">{account.email}</p>
                  <p className="text-xs text-pn-text-secondary">ID: {account.id}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apps List */}
      <div className="flex-1 overflow-y-auto">
        {selectedAccountId && isLoading && apps.length === 0 && (
          <div className="p-4 text-center text-pn-text-secondary">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading apps...</p>
          </div>
        )}
        
        {selectedAccountId && !isLoading && apps.length === 0 && (
          <div className="p-4 text-center text-pn-text-secondary">
            <FolderOpen className="w-5 h-5 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No apps found</p>
          </div>
        )}
        
        {selectedAccountId && apps.length > 0 && (
          <div className="p-4 border-b border-pn-border">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-pn-text-secondary">
                <FolderOpen className="w-4 h-4 inline mr-1" />
                Applications ({apps.length})
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
                    <ArrowDownWideNarrow className="w-4 h-4" />
                  ) : (
                    <SortAsc className="w-4 h-4" />
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
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center justify-between gap-2 ${
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
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center justify-between gap-2 ${
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
              <label className="block text-sm font-medium text-pn-text-secondary">
                <Key className="w-4 h-4 inline mr-1" />
                Key Sets ({keys.length})
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
                    <ArrowDownWideNarrow className="w-4 h-4" />
                  ) : (
                    <SortAsc className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-auto">
              <button
                onClick={() => setSelectedKeyId('all-keys')}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center justify-between gap-2 ${
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
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center justify-between gap-2 ${
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

      {/* User Info & Logout */}
      <div className="p-4 border-t border-pn-border">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="text-white font-medium truncate">
              User #{session?.userid}
            </p>
            <p className="text-pn-text-secondary text-xs">
              Account #{session?.accountid}
            </p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-pn-text-secondary hover:text-white hover:bg-pn-surface-light rounded transition-colors"
            title="Sign out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
