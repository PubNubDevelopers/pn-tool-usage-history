/**
 * Smart Data Fetcher
 * 
 * Orchestrates data fetching with intelligent caching:
 * 1. Checks hierarchical cache before fetching
 * 2. Derives data from cached supersets when possible
 * 3. Only fetches when absolutely necessary
 * 4. Manages fetch deduplication and request queueing
 */

import {
  DataScope,
  FetchParams,
  CacheStrategy,
  UsageCacheManager,
  AppsCacheManager,
  KeysCacheManager,
} from './cacheManager';
import { UsageData, App, KeySet, Session } from '../types';
import * as api from './api';

// ============================================================================
// TYPES
// ============================================================================

export interface FetchOptions {
  force?: boolean; // Bypass cache
  background?: boolean; // Don't block on fetch
  preferCache?: boolean; // Use stale cache if available
}

export interface FetchResult<T> {
  data: T;
  fromCache: boolean;
  strategy: CacheStrategy;
  fetchTime?: number;
}

// ============================================================================
// IN-FLIGHT REQUEST MANAGER
// ============================================================================

/**
 * Prevents duplicate simultaneous requests for the same data
 */
class InFlightRequestManager {
  private requests: Map<string, Promise<any>> = new Map();

  async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if request already in flight
    const existing = this.requests.get(key);
    if (existing) {
      console.log('[SmartFetcher] Deduplicating request:', key);
      return existing;
    }

    // Start new request
    const promise = fetcher().finally(() => {
      this.requests.delete(key);
    });

    this.requests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.requests.clear();
  }
}

// ============================================================================
// SMART DATA FETCHER
// ============================================================================

export class SmartDataFetcher {
  private usageCache: UsageCacheManager;
  private appsCache: AppsCacheManager;
  private keysCache: KeysCacheManager;
  private inFlightManager: InFlightRequestManager;
  private session: Session | null = null;
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.usageCache = new UsageCacheManager({ DEBUG: debug });
    this.appsCache = new AppsCacheManager({ DEBUG: debug });
    this.keysCache = new KeysCacheManager({ DEBUG: debug });
    this.inFlightManager = new InFlightRequestManager();
    this.debug = debug;
  }

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  setSession(session: Session | null): void {
    this.session = session;
    if (!session) {
      this.clearAll();
    }
  }

  // --------------------------------------------------------------------------
  // USAGE DATA FETCHING
  // --------------------------------------------------------------------------

  async fetchUsage(
    scope: DataScope,
    params: FetchParams,
    options: FetchOptions = {}
  ): Promise<FetchResult<UsageData>> {
    const startTime = Date.now();
    
    this.log('📊 Fetching usage data', { scope, params, options });

    // Force fetch bypasses cache
    if (options.force) {
      const data = await this.fetchUsageFromAPI(scope, params);
      this.usageCache.set(scope, params, data);
      return {
        data,
        fromCache: false,
        strategy: 'miss',
        fetchTime: Date.now() - startTime,
      };
    }

    // Check cache strategy
    const { strategy, entry, supersetEntry } = this.usageCache.checkCacheStrategy(
      scope,
      params
    );

    // Handle based on strategy
    switch (strategy) {
      case 'hit':
        // Exact cache hit
        this.log('✓ Using cached usage data');
        return {
          data: entry!.data,
          fromCache: true,
          strategy: 'hit',
        };

      case 'derivable': {
        // Can derive from superset
        this.log('✓ Deriving usage data from superset');
        const derived = this.usageCache.deriveFromSuperset(scope, supersetEntry!);
        if (derived) {
          return {
            data: derived,
            fromCache: true,
            strategy: 'derivable',
          };
        }
        // Derivation failed, fallthrough to fetch
        this.log('⚠ Derivation failed, fetching from API');
        // Fall through to fetch from API
      }
      // Falls through
      case 'superset-needed':
      case 'miss':
      default: {
        // Need to fetch
        const data = await this.fetchUsageFromAPI(scope, params);
        this.usageCache.set(scope, params, data);
        return {
          data,
          fromCache: false,
          strategy,
          fetchTime: Date.now() - startTime,
        };
      }
    }
  }

  /**
   * Fetch usage data from API with deduplication
   */
  private async fetchUsageFromAPI(
    scope: DataScope,
    params: FetchParams
  ): Promise<UsageData> {
    if (!this.session?.token) {
      throw new Error('No session available');
    }

    const requestKey = `usage:${scope.accountId}:${scope.appId}:${scope.keyId}:${params.startDate}:${params.endDate}`;
    
    return this.inFlightManager.deduplicate(requestKey, async () => {
      this.log('🌐 API call: getUsage', { scope, params });
      
      return api.getUsage({
        token: this.session!.token,
        accountId: scope.accountId,
        appId: scope.appId !== 'all' ? scope.appId as number : undefined,
        keyId: scope.keyId !== 'all' ? scope.keyId as number : undefined,
        start: params.startDate,
        end: params.endDate,
      });
    });
  }

  /**
   * Fetch usage for a specific key (convenience method)
   */
  async fetchUsageForKey(
    accountId: number,
    keyId: number,
    startDate: string,
    endDate: string,
    options?: FetchOptions
  ): Promise<FetchResult<UsageData>> {
    return this.fetchUsage(
      { level: 'keyset', accountId, keyId },
      { startDate, endDate },
      options
    );
  }

  /**
   * Get cached usage without fetching (for synchronous access)
   */
  getCachedUsage(scope: DataScope, params: FetchParams): UsageData | null {
    return this.usageCache.get(scope, params);
  }

  // --------------------------------------------------------------------------
  // APPS FETCHING
  // --------------------------------------------------------------------------

  async fetchApps(
    accountId: number,
    options: FetchOptions = {}
  ): Promise<FetchResult<App[]>> {
    const startTime = Date.now();
    const scope: DataScope = { level: 'account', accountId };
    const params: FetchParams = { startDate: '', endDate: '' }; // Apps don't need date params
    
    this.log('📱 Fetching apps', { accountId, options });

    // Force fetch
    if (options.force) {
      const data = await this.fetchAppsFromAPI(accountId);
      this.appsCache.set(scope, params, data);
      return {
        data,
        fromCache: false,
        strategy: 'miss',
        fetchTime: Date.now() - startTime,
      };
    }

    // Check cache
    const { strategy, entry } = this.appsCache.checkCacheStrategy(scope, params);

    if (strategy === 'hit' && entry) {
      this.log('✓ Using cached apps');
      return {
        data: entry.data,
        fromCache: true,
        strategy: 'hit',
      };
    }

    // Fetch from API
    const data = await this.fetchAppsFromAPI(accountId);
    this.appsCache.set(scope, params, data);
    return {
      data,
      fromCache: false,
      strategy,
      fetchTime: Date.now() - startTime,
    };
  }

  private async fetchAppsFromAPI(accountId: number): Promise<App[]> {
    if (!this.session?.token) {
      throw new Error('No session available');
    }

    const requestKey = `apps:${accountId}`;
    
    return this.inFlightManager.deduplicate(requestKey, async () => {
      this.log('🌐 API call: getApps', { accountId });
      const response = await api.getApps(accountId, this.session!.token);
      return response.result || [];
    });
  }

  // --------------------------------------------------------------------------
  // KEYS FETCHING
  // --------------------------------------------------------------------------

  async fetchKeys(
    accountId: number,
    appId: number,
    options: FetchOptions = {}
  ): Promise<FetchResult<KeySet[]>> {
    const startTime = Date.now();
    const scope: DataScope = { level: 'app', accountId, appId };
    const params: FetchParams = { startDate: '', endDate: '' };
    
    this.log('🔑 Fetching keys', { accountId, appId, options });

    // Force fetch
    if (options.force) {
      const data = await this.fetchKeysFromAPI(appId);
      this.keysCache.set(scope, params, data);
      return {
        data,
        fromCache: false,
        strategy: 'miss',
        fetchTime: Date.now() - startTime,
      };
    }

    // Check cache
    const { strategy, entry } = this.keysCache.checkCacheStrategy(scope, params);

    if (strategy === 'hit' && entry) {
      this.log('✓ Using cached keys');
      return {
        data: entry.data,
        fromCache: true,
        strategy: 'hit',
      };
    }

    // Fetch from API
    const data = await this.fetchKeysFromAPI(appId);
    this.keysCache.set(scope, params, data);
    return {
      data,
      fromCache: false,
      strategy,
      fetchTime: Date.now() - startTime,
    };
  }

  private async fetchKeysFromAPI(appId: number): Promise<KeySet[]> {
    if (!this.session?.token) {
      throw new Error('No session available');
    }

    const requestKey = `keys:${appId}`;
    
    return this.inFlightManager.deduplicate(requestKey, async () => {
      this.log('🌐 API call: getKeys', { appId });
      return api.getKeys(appId, this.session!.token);
    });
  }

  // --------------------------------------------------------------------------
  // CACHE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Invalidate cache for a specific scope
   */
  invalidate(scope?: DataScope): void {
    this.log('🗑️ Invalidating cache', { scope });
    this.usageCache.invalidate(scope);
    if (!scope || scope.level === 'account') {
      this.appsCache.invalidate(scope);
      this.keysCache.invalidate(scope);
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.log('🗑️ Clearing all caches');
    this.usageCache.invalidate();
    this.appsCache.invalidate();
    this.keysCache.invalidate();
    this.inFlightManager.clear();
  }

  /**
   * Get cache metrics for monitoring
   */
  getMetrics() {
    return {
      usage: this.usageCache.getMetrics(),
      apps: this.appsCache.getMetrics(),
      keys: this.keysCache.getMetrics(),
    };
  }

  /**
   * Get cache hit rates
   */
  getHitRates() {
    return {
      usage: this.usageCache.getHitRate(),
      apps: this.appsCache.getHitRate(),
      keys: this.keysCache.getHitRate(),
    };
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[SmartFetcher] ${message}`, data || '');
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Export a singleton instance for use across the app
export const smartFetcher = new SmartDataFetcher(
  import.meta.env?.DEV || false
);

export default smartFetcher;
