import { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { Session, Account, App, KeySet, UsageData } from '../types';
import * as api from '../services/api';

interface AuthContextType {
  // Session
  session: Session | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;

  // Accounts
  accounts: Account[];
  searchResults: Account[];
  searchAccounts: (email: string) => Promise<void>;
  clearSearchResults: () => void;
  selectedAccountId: number | null;
  selectedAccount: Account | null;
  setSelectedAccountId: (id: number | null) => void;

  // Apps
  apps: App[];
  selectedAppId: number | string | null;
  setSelectedAppId: (id: number | string | null) => void;
  fetchApps: (accountId: number) => Promise<void>;

  // Keys
  keys: KeySet[];
  selectedKeyId: number | string | null;
  setSelectedKeyId: (id: number | string | null) => void;
  fetchKeys: (appId: number) => Promise<void>;

  // Usage
  usage: UsageData | null;
  fetchUsage: () => Promise<void>;
  fetchUsageForKey: (keyId: number, start: string, end: string) => Promise<UsageData>;
  getCachedUsageForKey: (keyId: number, start: string, end: string) => UsageData | null;
  isLoadingUsage: boolean;

  // Date range
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  
  // Cache management
  clearUsageCache: () => void;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Helper to get default date range (last 90 days)
const getDefaultDateRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const defaultDates = getDefaultDateRange();
  
  // Session state
  const [session, setSession] = useState<Session | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [searchResults, setSearchResults] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedAccountId, setSelectedAccountIdState] = useState<number | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [selectedAppId, setSelectedAppIdState] = useState<number | string | null>(null);
  const [keys, setKeys] = useState<KeySet[]>([]);
  const [selectedKeyId, setSelectedKeyIdState] = useState<number | string | null>(null);

  // Usage state
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  // Cache state
  const [usageCache, setUsageCache] = useState<Map<string, { data: UsageData; fetchedAt: number }>>(new Map());
  const [appsCache, setAppsCache] = useState<Map<number, App[]>>(new Map());
  const [keysCache, setKeysCache] = useState<Map<number, KeySet[]>>(new Map());

  // Date range state
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  // Refs for stable access in callbacks
  const sessionRef = useRef(session);
  sessionRef.current = session;
  
  const appsCacheRef = useRef(appsCache);
  appsCacheRef.current = appsCache;
  
  const keysCacheRef = useRef(keysCache);
  keysCacheRef.current = keysCache;
  
  const usageCacheRef = useRef(usageCache);
  usageCacheRef.current = usageCache;

  // Cache helper functions
  const getUsageCacheKey = useCallback((params: { 
    accountId: number; 
    appId?: number | string; 
    keyId?: number | string;
    start: string;
    end: string;
  }) => {
    const appKey = params.appId ?? 'all';
    const keyKey = params.keyId ?? 'all';
    return `${params.accountId}-${appKey}-${keyKey}-${params.start}-${params.end}`;
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.login(username, password);
      setSession(data.session);
      setAccounts(data.accounts);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setAccounts([]);
    setSearchResults([]);
    setApps([]);
    setKeys([]);
    setUsage(null);
    setSelectedAccountIdState(null);
    setSelectedAppIdState(null);
    setSelectedKeyIdState(null);
    
    // Clear all caches
    setAppsCache(new Map());
    setKeysCache(new Map());
    setUsageCache(new Map());
  }, []);

  const searchAccountsFunc = useCallback(async (email: string) => {
    if (!sessionRef.current?.token) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await api.searchAccounts(email, sessionRef.current.token);
      setSearchResults(Array.isArray(results) ? results : [results]);
    } catch (err: any) {
      setError(err.message || 'Failed to search accounts');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
  }, []);

  const setSelectedAccountId = useCallback((id: number | null) => {
    const previousAccountId = selectedAccountId;
    setSelectedAccountIdState(id);
    
    // When selecting an account, add it to the accounts list if it's from search results
    if (id !== null) {
      const accountToAdd = searchResults.find(acc => acc.id === id);
      if (accountToAdd && !accounts.some(acc => acc.id === id)) {
        setAccounts(prev => [...prev, accountToAdd]);
      }
    }
    
    setApps([]);
    setKeys([]);
    setSelectedAppIdState(null);
    setSelectedKeyIdState(null);
    setUsage(null);

    // Clear cache when changing accounts or clearing selection
    if (id === null || (previousAccountId !== null && previousAccountId !== id)) {
      setAppsCache(new Map());
      setKeysCache(new Map());
      setUsageCache(new Map());
    }
  }, [selectedAccountId, searchResults, accounts]);

  const fetchApps = useCallback(async (accountId: number) => {
    if (!sessionRef.current?.token) return;
    
    // Check cache first using ref
    const cached = appsCacheRef.current.get(accountId);
    if (cached) {
      setApps(cached);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getApps(accountId, sessionRef.current.token);
      const appsList = data.result || [];
      setApps(appsList);
      
      // Store in cache
      setAppsCache(prev => {
        const newCache = new Map(prev);
        newCache.set(accountId, appsList);
        return newCache;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch apps');
      setApps([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove appsCache from dependencies

  const setSelectedAppId = useCallback((id: number | string | null) => {
    setSelectedAppIdState(id);
    setKeys([]);
    setSelectedKeyIdState(null);
  }, []);

  const fetchKeys = useCallback(async (appId: number) => {
    if (!sessionRef.current?.token) return;
    
    // Check cache first using ref
    const cached = keysCacheRef.current.get(appId);
    if (cached) {
      setKeys(cached);
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await api.getKeys(appId, sessionRef.current.token);
      const keysList = data || [];
      setKeys(keysList);
      
      // Store in cache
      setKeysCache(prev => {
        const newCache = new Map(prev);
        newCache.set(appId, keysList);
        return newCache;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch keys');
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove keysCache from dependencies

  const setSelectedKeyId = useCallback((id: number | string | null) => {
    setSelectedKeyIdState(id);
  }, []);

  // Clear usage cache entries for old date ranges when dates change
  const clearOldUsageCacheEntries = useCallback((newStartDate: string, newEndDate: string) => {
    setUsageCache(prev => {
      const newCache = new Map(prev);
      const keysToDelete: string[] = [];
      
      // Find cache entries with old date ranges
      newCache.forEach((value, key) => {
        const parts = key.split('-');
        if (parts.length >= 5) {
          const cachedStart = parts[parts.length - 2];
          const cachedEnd = parts[parts.length - 1];
          
          // If dates don't match, mark for deletion
          if (cachedStart !== newStartDate || cachedEnd !== newEndDate) {
            keysToDelete.push(key);
          }
        }
      });
      
      // Remove old entries
      keysToDelete.forEach(key => newCache.delete(key));
      
      return newCache;
    });
  }, []);

  // Wrapped date setters that clear cache
  const handleSetStartDate = useCallback((date: string) => {
    setStartDate(date);
    clearOldUsageCacheEntries(date, endDate);
  }, [endDate, clearOldUsageCacheEntries]);

  const handleSetEndDate = useCallback((date: string) => {
    setEndDate(date);
    clearOldUsageCacheEntries(startDate, date);
  }, [startDate, clearOldUsageCacheEntries]);

  // Manual cache clear function
  const clearUsageCache = useCallback(() => {
    setUsageCache(new Map());
  }, []);

  // Fetch usage for a specific key with caching
  const fetchUsageForKey = useCallback(async (keyId: number, start: string, end: string): Promise<UsageData> => {
    if (!sessionRef.current?.token || !selectedAccountId) {
      throw new Error('No session or account selected');
    }
    
    // Generate cache key
    const cacheKey = getUsageCacheKey({
      accountId: selectedAccountId,
      keyId,
      start,
      end,
    });
    
    // Check cache first using ref
    const cached = usageCacheRef.current.get(cacheKey);
    if (cached) {
      return cached.data;
    }
    
    // Fetch from API
    const data = await api.getUsage({
      token: sessionRef.current.token,
      accountId: selectedAccountId,
      keyId,
      start,
      end,
    });
    
    // Store in cache
    setUsageCache(prev => {
      const newCache = new Map(prev);
      newCache.set(cacheKey, {
        data,
        fetchedAt: Date.now(),
      });
      return newCache;
    });
    
    return data;
  }, [selectedAccountId, getUsageCacheKey]); // Remove usageCache from dependencies

  // Get cached usage for a key without fetching
  const getCachedUsageForKey = useCallback((keyId: number, start: string, end: string): UsageData | null => {
    if (!selectedAccountId) return null;
    
    const cacheKey = getUsageCacheKey({
      accountId: selectedAccountId,
      keyId,
      start,
      end,
    });
    
    const cached = usageCacheRef.current.get(cacheKey);
    return cached ? cached.data : null;
  }, [selectedAccountId, getUsageCacheKey]); // Remove usageCache from dependencies

  const fetchUsage = useCallback(async () => {
    if (!sessionRef.current?.token || !selectedAccountId) return;
    
    // Generate cache key
    const cacheKey = getUsageCacheKey({
      accountId: selectedAccountId,
      appId: selectedAppId ?? undefined,
      keyId: selectedKeyId ?? undefined,
      start: startDate,
      end: endDate,
    });
    
    // Check cache first using ref
    const cached = usageCacheRef.current.get(cacheKey);
    if (cached) {
      setUsage(cached.data);
      return;
    }
    
    setIsLoadingUsage(true);
    setError(null);
    
    try {
      const data = await api.getUsage({
        token: sessionRef.current.token,
        accountId: selectedAccountId,
        appId: selectedAppId !== 'all-apps' ? selectedAppId as number : undefined,
        keyId: selectedKeyId !== 'all-keys' ? selectedKeyId as number : undefined,
        start: startDate,
        end: endDate,
      });
      setUsage(data);
      
      // Store in cache
      setUsageCache(prev => {
        const newCache = new Map(prev);
        newCache.set(cacheKey, {
          data,
          fetchedAt: Date.now(),
        });
        return newCache;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch usage');
    } finally {
      setIsLoadingUsage(false);
    }
  }, [selectedAccountId, selectedAppId, selectedKeyId, startDate, endDate, getUsageCacheKey]); // Remove usageCache from dependencies

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session,
        login,
        logout,
        accounts,
        searchResults,
        searchAccounts: searchAccountsFunc,
        clearSearchResults,
        selectedAccountId,
        selectedAccount: selectedAccountId
          ? [...accounts, ...searchResults].find(acc => acc.id === selectedAccountId) || null
          : null,
        setSelectedAccountId,
        apps,
        selectedAppId,
        setSelectedAppId,
        fetchApps,
        keys,
        selectedKeyId,
        setSelectedKeyId,
        fetchKeys,
        usage,
        fetchUsage,
        fetchUsageForKey,
        getCachedUsageForKey,
        isLoadingUsage,
        startDate,
        endDate,
        setStartDate: handleSetStartDate,
        setEndDate: handleSetEndDate,
        clearUsageCache,
        isLoading,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
