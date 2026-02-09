/**
 * Screen State Manager
 * 
 * Persists UI state across screen navigation:
 * - Chart settings (granularity, view mode)
 * - Table filters and sorting
 * - Scroll positions
 * - Expanded/collapsed states
 * 
 * Restores state when returning to a screen, providing seamless UX
 */

// ============================================================================
// TYPES
// ============================================================================

export type ScreenId = 'dashboard' | 'usage-summary' | 'features';

export interface DashboardState {
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
  scrollPosition: number;
  expandedSections: string[];
}

export interface UsageSummaryState {
  expandedApps: number[];
  scrollPosition: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface FeaturesState {
  expandedApps: number[];
  scrollPosition: number;
  sortField?: string;
  sortDirection?: 'asc' | 'desc' | null;
  filters: Record<string, boolean>;
}

export type ScreenState = DashboardState | UsageSummaryState | FeaturesState;

export interface ScreenStateEntry {
  screenId: ScreenId;
  state: ScreenState;
  lastUpdated: number;
  accountId: number;
  appId?: number | string;
  keyId?: number | string;
}

// ============================================================================
// SCREEN STATE MANAGER
// ============================================================================

export class ScreenStateManager {
  private states: Map<string, ScreenStateEntry>;
  private maxAge: number;
  private debug: boolean;

  constructor(maxAgeMs: number = 30 * 60 * 1000, debug: boolean = false) {
    this.states = new Map();
    this.maxAge = maxAgeMs;
    this.debug = debug;
  }

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Saves screen state
   */
  saveState(
    screenId: ScreenId,
    state: ScreenState,
    context: {
      accountId: number;
      appId?: number | string;
      keyId?: number | string;
    }
  ): void {
    const key = this.getStateKey(screenId, context);
    
    const entry: ScreenStateEntry = {
      screenId,
      state,
      lastUpdated: Date.now(),
      accountId: context.accountId,
      appId: context.appId,
      keyId: context.keyId,
    };

    this.states.set(key, entry);
    this.log('💾 Saved screen state', { screenId, context });
  }

  /**
   * Retrieves screen state
   */
  getState(
    screenId: ScreenId,
    context: {
      accountId: number;
      appId?: number | string;
      keyId?: number | string;
    }
  ): ScreenState | null {
    const key = this.getStateKey(screenId, context);
    const entry = this.states.get(key);

    if (!entry) {
      this.log('ℹ️ No saved state found', { screenId, context });
      return null;
    }

    // Check if expired
    if (Date.now() - entry.lastUpdated > this.maxAge) {
      this.states.delete(key);
      this.log('⏰ State expired', { screenId, context });
      return null;
    }

    this.log('📂 Retrieved screen state', { screenId, context });
    return entry.state;
  }

  /**
   * Clears state for a specific screen
   */
  clearState(
    screenId: ScreenId,
    context?: {
      accountId: number;
      appId?: number | string;
      keyId?: number | string;
    }
  ): void {
    if (!context) {
      // Clear all states for this screen
      const keysToDelete: string[] = [];
      this.states.forEach((entry, key) => {
        if (entry.screenId === screenId) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => this.states.delete(key));
      this.log('🗑️ Cleared all states for screen', { screenId });
    } else {
      // Clear specific state
      const key = this.getStateKey(screenId, context);
      this.states.delete(key);
      this.log('🗑️ Cleared state', { screenId, context });
    }
  }

  /**
   * Clears all states (e.g., on logout or account change)
   */
  clearAll(): void {
    this.states.clear();
    this.log('🗑️ Cleared all screen states');
  }

  /**
   * Clears states for a specific account
   */
  clearAccount(accountId: number): void {
    const keysToDelete: string[] = [];
    this.states.forEach((entry, key) => {
      if (entry.accountId === accountId) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.states.delete(key));
    this.log('🗑️ Cleared states for account', { accountId });
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  /**
   * Generates a unique key for state storage
   */
  private getStateKey(
    screenId: ScreenId,
    context: {
      accountId: number;
      appId?: number | string;
      keyId?: number | string;
    }
  ): string {
    const appKey = context.appId ?? 'all';
    const keyKey = context.keyId ?? 'all';
    return `${screenId}:${context.accountId}:${appKey}:${keyKey}`;
  }

  private log(message: string, data?: any): void {
    if (this.debug) {
      console.log(`[ScreenStateManager] ${message}`, data || '');
    }
  }

  /**
   * Gets statistics about stored states
   */
  getStats() {
    return {
      totalStates: this.states.size,
      byScreen: this.getStatesByScreen(),
    };
  }

  private getStatesByScreen() {
    const counts: Record<string, number> = {};
    this.states.forEach((entry) => {
      counts[entry.screenId] = (counts[entry.screenId] || 0) + 1;
    });
    return counts;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const screenStateManager = new ScreenStateManager(
  30 * 60 * 1000, // 30 minutes
  import.meta.env?.DEV || false
);

export default screenStateManager;
