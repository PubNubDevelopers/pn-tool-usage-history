/**
 * useSmartData Hook
 * 
 * Provides a convenient React hook API for components to:
 * 1. Fetch data with intelligent caching
 * 2. Persist and restore screen state
 * 3. Handle loading and error states
 * 4. Automatic cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { smartFetcher } from '../services/smartFetcher';
import {
  screenStateManager,
  ScreenId,
  ScreenState,
  DashboardState,
  UsageSummaryState,
  FeaturesState,
} from '../services/screenStateManager';
import { DataScope, FetchParams } from '../services/cacheManager';
import { UsageData } from '../types';

// ============================================================================
// HOOK INTERFACES
// ============================================================================

export interface UseSmartUsageOptions {
  screenId: ScreenId;
  autoFetch?: boolean;
  enabled?: boolean;
}

export interface UseSmartUsageResult {
  usage: UsageData | null;
  isLoading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
  fromCache: boolean;
}

export interface UseScreenStateOptions<T extends ScreenState> {
  screenId: ScreenId;
  defaultState: T;
}

export interface UseScreenStateResult<T extends ScreenState> {
  state: T;
  setState: (updates: Partial<T>) => void;
  resetState: () => void;
}

// ============================================================================
// USAGE DATA HOOK
// ============================================================================

/**
 * Hook for fetching usage data with smart caching
 */
export function useSmartUsage(options: UseSmartUsageOptions): UseSmartUsageResult {
  const {
    selectedAccountId,
    selectedAppId,
    selectedKeyId,
    startDate,
    endDate,
    session,
  } = useAuth();

  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const { autoFetch = true, enabled = true } = options;

  // Stable reference to prevent infinite loops
  const fetchParamsRef = useRef({ startDate, endDate });
  fetchParamsRef.current = { startDate, endDate };

  // Set session in smart fetcher
  useEffect(() => {
    if (session) {
      smartFetcher.setSession(session);
    }
  }, [session]);

  // Fetch function
  const fetchUsage = useCallback(
    async (force = false) => {
      if (!selectedAccountId || !enabled) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Build scope based on selection
        const scope: DataScope = {
          level: selectedKeyId && selectedKeyId !== 'all-keys'
            ? 'keyset'
            : selectedAppId && selectedAppId !== 'all-apps'
            ? 'app'
            : 'account',
          accountId: selectedAccountId,
          appId: selectedAppId ?? undefined,
          keyId: selectedKeyId ?? undefined,
        };

        const params: FetchParams = {
          startDate: fetchParamsRef.current.startDate,
          endDate: fetchParamsRef.current.endDate,
        };

        const result = await smartFetcher.fetchUsage(scope, params, { force });
        
        setUsage(result.data);
        setFromCache(result.fromCache);
        
        if (result.fetchTime) {
          console.log(`[useSmartUsage] Fetched in ${result.fetchTime}ms`);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch usage data');
        console.error('[useSmartUsage] Error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAccountId, selectedAppId, selectedKeyId, enabled]
  );

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchUsage();
    }
  }, [autoFetch, fetchUsage]);

  return {
    usage,
    isLoading,
    error,
    refetch: fetchUsage,
    fromCache,
  };
}

// ============================================================================
// SCREEN STATE HOOK
// ============================================================================

/**
 * Hook for persisting and restoring screen state
 */
export function useScreenState<T extends ScreenState>(
  options: UseScreenStateOptions<T>
): UseScreenStateResult<T> {
  const { screenId, defaultState } = options;
  const { selectedAccountId, selectedAppId, selectedKeyId } = useAuth();

  // Initialize state from saved state or default
  const [state, setStateInternal] = useState<T>(() => {
    if (!selectedAccountId) return defaultState;

    const savedState = screenStateManager.getState(screenId, {
      accountId: selectedAccountId,
      appId: selectedAppId ?? undefined,
      keyId: selectedKeyId ?? undefined,
    });

    return (savedState as T) || defaultState;
  });

  // Context for state saving
  const contextRef = useRef({
    accountId: selectedAccountId,
    appId: selectedAppId,
    keyId: selectedKeyId,
  });
  contextRef.current = {
    accountId: selectedAccountId,
    appId: selectedAppId,
    keyId: selectedKeyId,
  };

  // Update state and persist
  const setState = useCallback(
    (updates: Partial<T>) => {
      setStateInternal((prev) => {
        const newState = { ...prev, ...updates };
        
        // Persist to state manager
        if (contextRef.current.accountId) {
          screenStateManager.saveState(screenId, newState, {
            accountId: contextRef.current.accountId!,
            appId: contextRef.current.appId ?? undefined,
            keyId: contextRef.current.keyId ?? undefined,
          });
        }
        
        return newState;
      });
    },
    [screenId]
  );

  // Reset to default state
  const resetState = useCallback(() => {
    setStateInternal(defaultState);
    if (contextRef.current.accountId) {
      screenStateManager.clearState(screenId, {
        accountId: contextRef.current.accountId,
        appId: contextRef.current.appId ?? undefined,
        keyId: contextRef.current.keyId ?? undefined,
      });
    }
  }, [screenId, defaultState]);

  // Load saved state when context changes
  useEffect(() => {
    if (!selectedAccountId) return;

    const savedState = screenStateManager.getState(screenId, {
      accountId: selectedAccountId,
      appId: selectedAppId ?? undefined,
      keyId: selectedKeyId ?? undefined,
    });

    if (savedState) {
      setStateInternal(savedState as T);
    }
  }, [selectedAccountId, selectedAppId, selectedKeyId, screenId]);

  return {
    state,
    setState,
    resetState,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for Dashboard screen
 */
export function useDashboardState() {
  return useScreenState<DashboardState>({
    screenId: 'dashboard',
    defaultState: {
      granularity: 'day',
      scrollPosition: 0,
      expandedSections: [],
    },
  });
}

/**
 * Hook for Usage Summary screen
 */
export function useUsageSummaryState() {
  return useScreenState<UsageSummaryState>({
    screenId: 'usage-summary',
    defaultState: {
      expandedApps: [],
      scrollPosition: 0,
    },
  });
}

/**
 * Hook for Features screen
 */
export function useFeaturesState() {
  return useScreenState<FeaturesState>({
    screenId: 'features',
    defaultState: {
      expandedApps: [],
      scrollPosition: 0,
      filters: {},
    },
  });
}

// ============================================================================
// CACHE MANAGEMENT HOOKS
// ============================================================================

/**
 * Hook for cache metrics (for debugging/monitoring)
 */
export function useCacheMetrics() {
  const [metrics, setMetrics] = useState(() => smartFetcher.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(smartFetcher.getMetrics());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    hitRates: smartFetcher.getHitRates(),
  };
}

/**
 * Hook for invalidating cache
 */
export function useCacheInvalidation() {
  const { selectedAccountId, selectedAppId, selectedKeyId } = useAuth();

  const invalidate = useCallback(
    (level?: 'account' | 'app' | 'keyset') => {
      if (!level) {
        smartFetcher.clearAll();
        return;
      }

      if (!selectedAccountId) return;

      const scope: DataScope = {
        level,
        accountId: selectedAccountId,
        appId: level === 'app' || level === 'keyset' ? selectedAppId ?? undefined : undefined,
        keyId: level === 'keyset' ? selectedKeyId ?? undefined : undefined,
      };

      smartFetcher.invalidate(scope);
    },
    [selectedAccountId, selectedAppId, selectedKeyId]
  );

  return { invalidate };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default useSmartUsage;
