import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Building2, FolderOpen, Key, LogOut, Loader2, Search, X, BarChart3, TrendingUp } from 'lucide-react';

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
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const [searchEmail, setSearchEmail] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

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


  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <aside className="w-72 bg-pn-surface border-r border-pn-border flex flex-col min-h-screen">
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
        </nav>
      </div>

      {/* Account Search & Selection */}
      <div className="p-4 border-b border-pn-border">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-pn-text-secondary">
            <Building2 className="w-4 h-4 inline mr-1" />
            Customer Account
          </label>
          <button
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) {
                clearSearchResults();
                setSearchEmail('');
              }
            }}
            className="text-xs text-pn-blue hover:text-blue-400 transition-colors"
          >
            {showSearch ? 'Cancel' : 'Search by Email'}
          </button>
        </div>

        {showSearch ? (
          <div>
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
                    type="email"
                    placeholder="customer@example.com"
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

            {/* Search History */}
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

            {searchResults.length > 0 && (
              <div className="mt-2 max-h-48 overflow-auto space-y-1">
                {searchResults.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => {
                      setSelectedAccountId(account.id);
                      setShowSearch(false);
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
        ) : (
          <div>
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

            {selectedAccount && (
              <div className="mt-2 p-2 bg-pn-bg rounded text-xs text-pn-text-secondary">
                <p className="font-medium text-white truncate">
                  {selectedAccount.properties?.company || selectedAccount.email}
                </p>
                <p>ID: {selectedAccount.id}</p>
                <p className="truncate">{selectedAccount.email}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Apps List */}
      <div className="flex-1 overflow-auto">
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
            <label className="block text-sm font-medium text-pn-text-secondary mb-2">
              <FolderOpen className="w-4 h-4 inline mr-1" />
              Applications ({apps.length})
            </label>
            <div className="space-y-1 max-h-48 overflow-auto">
              <button
                onClick={() => {
                  setSelectedAppId('all-apps');
                  setSelectedKeyId('all-keys');
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  selectedAppId === 'all-apps'
                    ? 'bg-pn-blue text-white'
                    : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                }`}
              >
                All Applications
              </button>
              {apps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors truncate ${
                    selectedAppId === app.id
                      ? 'bg-pn-blue text-white'
                      : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                  }`}
                  title={app.name}
                >
                  {app.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Keys List */}
        {selectedAppId && selectedAppId !== 'all-apps' && keys.length > 0 && (
          <div className="p-4">
            <label className="block text-sm font-medium text-pn-text-secondary mb-2">
              <Key className="w-4 h-4 inline mr-1" />
              Key Sets ({keys.length})
            </label>
            <div className="space-y-1 max-h-48 overflow-auto">
              <button
                onClick={() => setSelectedKeyId('all-keys')}
                className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                  selectedKeyId === 'all-keys'
                    ? 'bg-pn-blue text-white'
                    : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                }`}
              >
                All Key Sets
              </button>
              {keys.map((key) => (
                <button
                  key={key.id}
                  onClick={() => setSelectedKeyId(key.id)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors truncate ${
                    selectedKeyId === key.id
                      ? 'bg-pn-blue text-white'
                      : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                  }`}
                  title={key.properties?.name || `Key ${key.id}`}
                >
                  {key.properties?.name || `Key ${key.id}`}
                </button>
              ))}
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
