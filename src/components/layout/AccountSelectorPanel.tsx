import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Search, Loader2, Building2 } from 'lucide-react';

interface AccountSelectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountSelectorPanel({ isOpen, onClose }: AccountSelectorPanelProps) {
  const {
    accounts,
    searchResults,
    searchAccounts,
    clearSearchResults,
    selectedAccountId,
    setSelectedAccountId,
    isLoading,
  } = useAuth();

  const [searchEmail, setSearchEmail] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // Load search history on mount
  useEffect(() => {
    const history = localStorage.getItem('pn_search_history');
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (err) {
        // Ignore invalid history data
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

  const handleSelectAccount = (accountId: number) => {
    setSelectedAccountId(accountId);
    clearSearchResults();
    setSearchEmail('');
    onClose();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchEmail) {
      saveToHistory(searchEmail);
      searchAccounts(searchEmail);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-pn-surface border-l border-pn-border shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-pn-border">
          <h2 className="text-lg font-semibold text-white">Select Account</h2>
          <button
            onClick={onClose}
            className="p-2 text-pn-text-secondary hover:text-white hover:bg-pn-surface-light rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Your Accounts Dropdown */}
          {accounts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-pn-text-secondary mb-2">
                <Building2 className="w-4 h-4 inline mr-1" />
                Your Accounts
              </label>
              <select
                value={selectedAccountId || ''}
                onChange={(e) => handleSelectAccount(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-sm rounded bg-pn-bg border border-pn-border text-white focus:outline-none focus:border-pn-blue"
              >
                <option value="">Select an account...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.properties?.company || account.email || `Account ${account.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Email/Domain Search */}
          <div>
            <label className="block text-sm font-medium text-pn-text-secondary mb-2">
              Search by Email or Domain
            </label>
            <form onSubmit={handleSearch} className="space-y-2">
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

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-pn-text-secondary mb-2">Search Results:</p>
                <div className="space-y-1 max-h-60 overflow-auto">
                  {searchResults.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectAccount(account.id)}
                      className="w-full text-left px-3 py-2 text-sm rounded bg-pn-bg hover:bg-pn-border text-white transition-colors"
                    >
                      <p className="font-medium truncate">
                        {account.properties?.company || account.email || `Account ${account.id}`}
                      </p>
                      <p className="text-xs text-pn-text-secondary truncate">{account.email}</p>
                      <p className="text-xs text-pn-text-secondary">ID: {account.id}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
