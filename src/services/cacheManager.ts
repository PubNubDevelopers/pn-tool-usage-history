/**
 * Hierarchical Cache Manager
 * 
 * Manages a sophisticated caching system with awareness of data hierarchy:
 * Account (superset) > App > KeySet (subset)
 * 
 * Prevents redundant API calls by:
 * 1. Detecting when requested data can be derived from cached supersets
 * 2. Recognizing when a superset fetch would be more efficient
 * 3. Managing cache invalidation intelligently
 */

import { UsageData, App, KeySet } from '../types';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type CacheLevel = 'account' | 'app' | 'keyset';
export type CacheStrategy = 'hit' | 'derivable' | 'miss' | 'superset-needed';

export interface DataScope {
  level: CacheLevel;
  accountId: number;
  appId?: number | string;
  keyId?: number | string;
}

export interface FetchParams {
  startDate: string;
  endDate: string;
  [key: string]: any; // Allow additional filter params
}

export interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  scope: DataScope;
  params: FetchParams;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  derivations: number;
  evictions: number;
  size: number;
}

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_CONFIG = {
  MAX_ENTRIES: 100,
  MAX_AGE_MS: 30 * 60 * 1000, // 30 minutes
  ENABLE_LRU: true,
  DEBUG: false,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generates a cache key from scope and params
 */
export function generateCacheKey(scope: DataScope, params: FetchParams): string {
  const { level, accountId, appId, keyId } = scope;
  const appKey = appId ?? 'all';
  const keyKey = keyId ?? 'all';
  return `${level}:${accountId}:${appKey}:${keyKey}:${params.startDate}:${params.endDate}`;
}

/**
 * Checks if date range A contains date range B
 */
function dateRangeContains(
  containerStart: string,
  containerEnd: string,
  subsetStart: string,
  subsetEnd: string
): boolean {
  return containerStart <= subsetStart && containerEnd >= subsetEnd;
}

/**
 * Checks if two date ranges overlap
 */
function dateRangesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 <= end2 && start2 <= end1;
}

/**
 * Determines scope hierarchy level (higher number = broader scope)
 */
function getScopeLevel(scope: DataScope): number {
  if (scope.level === 'account') return 3;
  if (scope.level === 'app') return 2;
  return 1; // keyset
}

/**
 * Checks if scopeA is a superset of scopeB
 */
function isSupersetScope(scopeA: DataScope, scopeB: DataScope): boolean {
  // Must be same account
  if (scopeA.accountId !== scopeB.accountId) return false;
  
  const levelA = getScopeLevel(scopeA);
  const levelB = getScopeLevel(scopeB);
  
  if (levelA <= levelB) return false; // A must be broader than B
  
  // If B is app-level, A must be account-level
  if (scopeB.level === 'app') {
    return scopeA.level === 'account';
  }
  
  // If B is keyset-level, A can be app (same app) or account
  if (scopeB.level === 'keyset') {
    if (scopeA.level === 'account') return true;
    if (scopeA.level === 'app') {
      return scopeA.appId === scopeB.appId;
    }
  }
  
  return false;
}

// ============================================================================
// CACHE HIERARCHY MANAGER
// ============================================================================

export class CacheHierarchyManager<T = any> {
  private cache: Map<string, CacheEntry<T>>;
  private metrics: CacheMetrics;
  private config: typeof CACHE_CONFIG;

  constructor(config: Partial<typeof CACHE_CONFIG> = {}) {
    this.cache = new Map();
    this.metrics = {
      hits: 0,
      misses: 0,
      derivations: 0,
      evictions: 0,
      size: 0,
    };
    this.config = { ...CACHE_CONFIG, ...config };
  }

  // --------------------------------------------------------------------------
  // PUBLIC API
  // --------------------------------------------------------------------------

  /**
   * Main entry point: Determines cache strategy for a request
   */
  checkCacheStrategy(
    requestScope: DataScope,
    requestParams: FetchParams
  ): {
    strategy: CacheStrategy;
    entry?: CacheEntry<T>;
    supersetEntry?: CacheEntry<T>;
  } {
    this.log('Checking cache strategy', { requestScope, requestParams });

    // 1. Check for exact match
    const exactMatch = this.findExactMatch(requestScope, requestParams);
    if (exactMatch) {
      this.metrics.hits++;
      this.log('✓ Cache HIT (exact match)', exactMatch);
      return { strategy: 'hit', entry: exactMatch };
    }

    // 2. Check if derivable from superset
    const derivableFrom = this.findDerivableSuperset(requestScope, requestParams);
    if (derivableFrom) {
      this.metrics.derivations++;
      this.log('✓ Cache DERIVABLE (from superset)', derivableFrom);
      return { strategy: 'derivable', supersetEntry: derivableFrom };
    }

    // 3. Check if we need to fetch a superset
    const subsetExists = this.findSubset(requestScope, requestParams);
    if (subsetExists) {
      this.log('! Cache SUPERSET-NEEDED (upgrading from subset)', subsetExists);
      return { strategy: 'superset-needed', entry: subsetExists };
    }

    // 4. Complete miss
    this.metrics.misses++;
    this.log('✗ Cache MISS', null);
    return { strategy: 'miss' };
  }

  /**
   * Stores data in cache with metadata
   */
  set(scope: DataScope, params: FetchParams, data: T): void {
    const key = generateCacheKey(scope, params);
    
    // Check if we need to evict old entries
    if (this.cache.size >= this.config.MAX_ENTRIES) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      data,
      fetchedAt: Date.now(),
      scope,
      params,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    this.cache.set(key, entry);
    this.metrics.size = this.cache.size;
    this.log('✓ Cached', { key, scope, params });

    // Remove any subset entries that are now redundant
    this.removeRedundantSubsets(scope, params);
  }

  /**
   * Retrieves cached data if available
   */
  get(scope: DataScope, params: FetchParams): T | null {
    const key = generateCacheKey(scope, params);
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.size = this.cache.size;
      return null;
    }
    
    // Update access metrics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  /**
   * Derives subset data from a cached superset
   */
  deriveFromSuperset(
    requestScope: DataScope,
    supersetEntry: CacheEntry<T>
  ): T | null {
    this.log('Deriving data from superset', { requestScope, supersetEntry: supersetEntry.scope });
    
    // Update access metrics
    supersetEntry.accessCount++;
    supersetEntry.lastAccessed = Date.now();

    // The derivation logic depends on data type
    // This is a placeholder - actual implementation should be in a derived class
    return supersetEntry.data;
  }

  /**
   * Invalidates cache for a specific scope or broader
   */
  invalidate(scope?: DataScope): void {
    if (!scope) {
      // Clear everything
      this.cache.clear();
      this.metrics.size = 0;
      this.log('! Invalidated ALL cache');
      return;
    }

    // Remove entries matching or narrower than scope
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (entry.scope.accountId === scope.accountId) {
        // If invalidating account, remove everything for that account
        if (scope.level === 'account') {
          keysToDelete.push(key);
        }
        // If invalidating app, remove that app and its keysets
        else if (scope.level === 'app' && entry.scope.appId === scope.appId) {
          keysToDelete.push(key);
        }
        // If invalidating keyset, remove only that keyset
        else if (scope.level === 'keyset' && entry.scope.keyId === scope.keyId) {
          keysToDelete.push(key);
        }
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    this.metrics.size = this.cache.size;
    this.log('! Invalidated cache', { scope, removed: keysToDelete.length });
  }

  /**
   * Gets cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Clears metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      derivations: 0,
      evictions: 0,
      size: this.cache.size,
    };
  }

  /**
   * Returns cache hit rate
   */
  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total === 0 ? 0 : this.metrics.hits / total;
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private findExactMatch(
    requestScope: DataScope,
    requestParams: FetchParams
  ): CacheEntry<T> | null {
    const key = generateCacheKey(requestScope, requestParams);
    const entry = this.cache.get(key);
    
    if (!entry || this.isExpired(entry)) {
      return null;
    }
    
    return entry;
  }

  private findDerivableSuperset(
    requestScope: DataScope,
    requestParams: FetchParams
  ): CacheEntry<T> | null {
    // Look for a cached entry that:
    // 1. Has a broader scope (superset)
    // 2. Has a date range that contains the requested range
    
    for (const [_, entry] of this.cache) {
      if (this.isExpired(entry)) continue;
      
      const isSupersetOfScope = isSupersetScope(entry.scope, requestScope);
      const containsDateRange = dateRangeContains(
        entry.params.startDate,
        entry.params.endDate,
        requestParams.startDate,
        requestParams.endDate
      );
      
      if (isSupersetOfScope && containsDateRange) {
        return entry;
      }
    }
    
    return null;
  }

  private findSubset(
    requestScope: DataScope,
    requestParams: FetchParams
  ): CacheEntry<T> | null {
    // Look for a cached entry that is a subset of the request
    
    for (const [_, entry] of this.cache) {
      if (this.isExpired(entry)) continue;
      
      const isSubsetOfScope = isSupersetScope(requestScope, entry.scope);
      const overlapsDateRange = dateRangesOverlap(
        entry.params.startDate,
        entry.params.endDate,
        requestParams.startDate,
        requestParams.endDate
      );
      
      if (isSubsetOfScope && overlapsDateRange) {
        return entry;
      }
    }
    
    return null;
  }

  private removeRedundantSubsets(scope: DataScope, params: FetchParams): void {
    // After caching a superset, remove any subset entries that are now redundant
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      const isSubset = isSupersetScope(scope, entry.scope);
      const dateContained = dateRangeContains(
        params.startDate,
        params.endDate,
        entry.params.startDate,
        entry.params.endDate
      );
      
      if (isSubset && dateContained) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
    if (keysToDelete.length > 0) {
      this.log('✓ Removed redundant subsets', { count: keysToDelete.length });
    }
  }

  private evictLRU(): void {
    if (!this.config.ENABLE_LRU) return;
    
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    });
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.metrics.evictions++;
      this.log('! Evicted LRU entry', { key: oldestKey });
    }
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.fetchedAt > this.config.MAX_AGE_MS;
  }

  private log(message: string, data?: any): void {
    if (this.config.DEBUG) {
      console.log(`[CacheManager] ${message}`, data || '');
    }
  }
}

// ============================================================================
// SPECIALIZED CACHE MANAGERS
// ============================================================================

/**
 * Cache manager specialized for Usage Data
 */
export class UsageCacheManager extends CacheHierarchyManager<UsageData> {
  /**
   * Derives usage data for a specific scope from superset data
   */
  deriveFromSuperset(
    requestScope: DataScope,
    supersetEntry: CacheEntry<UsageData>
  ): UsageData | null {
    const supersetData = supersetEntry.data;
    
    // If requesting account level, just return the data
    if (requestScope.level === 'account') {
      return supersetData;
    }
    
    // For app or keyset level, we would need to filter the data
    // This requires knowledge of how usage data is structured
    // For now, return null to trigger a fetch
    // TODO: Implement actual filtering logic based on data structure
    
    return null;
  }
}

/**
 * Cache manager specialized for Apps
 */
export class AppsCacheManager extends CacheHierarchyManager<App[]> {
  /**
   * Derives app data from account-level cache
   */
  deriveFromSuperset(
    requestScope: DataScope,
    supersetEntry: CacheEntry<App[]>
  ): App[] | null {
    const allApps = supersetEntry.data;
    
    // If requesting a specific app, filter the array
    if (requestScope.level === 'app' && requestScope.appId) {
      return allApps.filter(app => app.id === requestScope.appId);
    }
    
    return allApps;
  }
}

/**
 * Cache manager specialized for KeySets
 */
export class KeysCacheManager extends CacheHierarchyManager<KeySet[]> {
  /**
   * Derives keyset data from app-level cache
   */
  deriveFromSuperset(
    requestScope: DataScope,
    supersetEntry: CacheEntry<KeySet[]>
  ): KeySet[] | null {
    const allKeys = supersetEntry.data;
    
    // If requesting a specific keyset, filter the array
    if (requestScope.level === 'keyset' && requestScope.keyId) {
      return allKeys.filter(key => key.id === requestScope.keyId);
    }
    
    return allKeys;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CacheHierarchyManager;
