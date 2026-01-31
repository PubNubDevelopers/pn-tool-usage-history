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
  isLoadingUsage: boolean;

  // Date range
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;

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

  // Date range state
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  // Refs for stable access in callbacks
  const sessionRef = useRef(session);
  sessionRef.current = session;

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
    setSelectedAccountIdState(id);
    setApps([]);
    setKeys([]);
    setSelectedAppIdState(null);
    setSelectedKeyIdState(null);
    setUsage(null);
  }, []);

  const fetchApps = useCallback(async (accountId: number) => {
    if (!sessionRef.current?.token) return;
    setIsLoading(true);
    setError(null);
    console.log('fetchApps called for account:', accountId);
    try {
      const data = await api.getApps(accountId, sessionRef.current.token);
      console.log('Apps response:', data);
      const appsList = data.result || [];
      console.log('Setting apps:', appsList.length, 'apps');
      setApps(appsList);
    } catch (err: any) {
      console.error('Failed to fetch apps:', err);
      setError(err.message || 'Failed to fetch apps');
      setApps([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSelectedAppId = useCallback((id: number | string | null) => {
    setSelectedAppIdState(id);
    setKeys([]);
    setSelectedKeyIdState(null);
  }, []);

  const fetchKeys = useCallback(async (appId: number) => {
    if (!sessionRef.current?.token) return;
    setIsLoading(true);
    try {
      const data = await api.getKeys(appId, sessionRef.current.token);
      setKeys(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch keys');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setSelectedKeyId = useCallback((id: number | string | null) => {
    setSelectedKeyIdState(id);
  }, []);

  const fetchUsage = useCallback(async () => {
    if (!sessionRef.current?.token || !selectedAccountId) return;
    
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
    } catch (err: any) {
      setError(err.message || 'Failed to fetch usage');
    } finally {
      setIsLoadingUsage(false);
    }
  }, [selectedAccountId, selectedAppId, selectedKeyId, startDate, endDate]);

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
        isLoadingUsage,
        startDate,
        endDate,
        setStartDate,
        setEndDate,
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
