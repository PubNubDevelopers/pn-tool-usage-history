export interface Session {
  userid: number;
  token: string;
  accountid: number;
}

export interface Account {
  id: number;
  email: string;
  properties?: {
    company?: string;
  };
}

export interface App {
  id: number;
  name: string;
  created: string;
  owner_id: number;
}

export interface KeySet {
  id: number;
  created: string;
  properties?: {
    name?: string;
  };
  publish_key?: string;
  subscribe_key?: string;
  pnconfig?: {
    presence?: boolean;
    storage?: boolean;
    access_manager?: boolean;
    apns?: boolean;
    gcm?: boolean;
    w3c?: boolean;
    mpns?: boolean;
    wildcard_subscribe?: boolean;
    objects?: boolean;
    files_enabled?: boolean;
  };
}

export interface UsageMetric {
  [timestamp: string]: {
    sum?: number;
    days?: {
      [dayTimestamp: string]: number;
    };
  };
}

export interface UsageData {
  transactions_total?: UsageMetric;
  replicated?: UsageMetric;
  edge?: UsageMetric;
  signals?: UsageMetric;
  executions?: UsageMetric;
  message_actions?: UsageMetric;
  mtd_uuid?: UsageMetric;
  [key: string]: UsageMetric | undefined;
}

export interface MetricDefinition {
  metric: string;
  type: 'rep' | 'edg' | 'sig' | 'ma' | 'fun';
  feature: string;
  action: string;
}

export interface ChartDataPoint {
  date: string;
  replicated: number;
  edge: number;
  signals: number;
  total: number;
  mau?: number;
  functions?: number;
  messageActions?: number;
}

export interface FeatureBreakdown {
  feature: string;
  transactions: number;
  cost: number;
}

export interface TransactionTypeSummary {
  name: string;
  value: number;
  color: string;
}

// Cache-related types
export interface UsageCacheKey {
  accountId: number;
  appId: number | 'all-apps';
  keyId: number | 'all-keys';
  startDate: string;
  endDate: string;
}

export interface UsageCacheEntry {
  data: UsageData;
  fetchedAt: number;
}

// Features page types
export interface FeatureStatus {
  streamController: boolean; // Stream Controller (NEW)
  history: boolean; // Message Persistence
  presence: boolean;
  accessManager: boolean;
  push: boolean; // Mobile Push
  appContext: boolean;
  files: boolean;
  functions: boolean;
  eventsActions: boolean;
  illuminate: boolean;

  // Optional detailed configurations (populated on-demand)
  streamControllerConfig?: StreamControllerConfig;
  historyConfig?: MessagePersistenceConfig;
  presenceConfig?: PresenceConfig;
  accessManagerConfig?: AccessManagerConfig;
  pushConfig?: PushConfig;
  appContextConfig?: AppContextConfig;
  filesConfig?: FilesConfig;
  functionsConfig?: FunctionsConfig;
  eventsActionsConfig?: EventsActionsConfig;
}

// Detailed configuration interfaces

export interface StreamControllerConfig {
  wildcardSubscribeEnabled: boolean;
  channelGroupLimit: number;
}

export interface MessagePersistenceConfig {
  enabled: boolean;
  retentionDays: number; // 1, 7, 30, 90, 180, 365, 0 (unlimited)
  deleteFromHistory: boolean;
  includePresenceEvents: boolean;
}

export interface PresenceConfig {
  enabled: boolean;
  interval: number; // seconds (minimum 10)
  announceMax: number; // 0-100
  debounce: number; // seconds
  deltas: boolean;
  generateLeaveOnDisconnect: boolean;
  streamFiltering: boolean;
  activeNoticeChannel?: string;
}

export interface AccessManagerConfig {
  enabled: boolean;
  ttl: number; // minutes
  revokeEnabled: boolean;
}

export interface PushConfig {
  apns: {
    enabled: boolean;
    environment?: 'development' | 'production';
  };
  gcm: {
    enabled: boolean;
    apiKey?: string;
  };
  w3c?: {
    enabled: boolean;
  };
  mpns?: {
    enabled: boolean;
  };
}

export interface AppContextConfig {
  enabled: boolean;
  region: string; // 'us-east-1', 'eu-central-1', etc.
  userMetadataEvents: boolean;
  channelMetadataEvents: boolean;
  membershipEvents: boolean;
  referentialIntegrity: boolean;
  disallowGetAllUserMetadata?: boolean;
  disallowGetAllChannelMetadata?: boolean;
}

export interface FilesConfig {
  enabled: boolean;
  retentionDays: number; // 1, 7, 30, 0 (unlimited)
  region: string;
}

export interface FunctionsConfig {
  modules: Array<{
    id: string;
    name: string;
    functions: Array<{
      id: string;
      name: string;
      type: 'before-publish' | 'after-publish' | 'on-request';
      enabled: boolean;
    }>;
  }>;
  totalModules: number;
  totalFunctions: number;
  runningFunctions: number;
}

export interface EventsActionsConfig {
  listeners: Array<{
    id: string;
    name: string;
    event: string;
    enabled: boolean;
  }>;
  actions: Array<{
    id: string;
    name: string;
    type: string;
    enabled: boolean;
  }>;
  totalListeners: number;
  totalActions: number;
  runningListeners: number;
  runningActions: number;
}

export interface KeysetFeatures {
  keyId: number;
  keyName: string;
  subscribeKey?: string;
  publishKey?: string;
  features: FeatureStatus;
}

export interface AppFeatures {
  appId: number;
  appName: string;
  keysets: KeysetFeatures[];
  appLevelFeatures: {
    insights: boolean;
    bizops: boolean;
  };
  expanded: boolean;
}
