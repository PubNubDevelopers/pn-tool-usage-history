// User-friendly labels for feature properties

export const FEATURE_LABELS: Record<string, string> = {
  // Stream Controller
  wildcardSubscribe: 'Wildcard Subscribe',
  channelGroupLimit: 'Channel Group Limit',

  // Message Persistence
  enabled: 'Status',
  retentionDays: 'Message Retention',
  deleteFromHistory: 'Delete from History',
  includePresenceEvents: 'Include Presence Events',

  // Presence
  interval: 'Announcement Interval',
  announceMax: 'Maximum Announced Users',
  debounce: 'Debounce Period',
  deltas: 'Delta Notifications',
  generateLeaveOnDisconnect: 'Leave on Disconnect',
  streamFiltering: 'Stream Filtering',
  activeNoticeChannel: 'Active Notice Channel',

  // Access Manager
  ttl: 'Default Token TTL',
  revokeEnabled: 'Revoke on Access Denied',

  // Mobile Push
  apnsEnabled: 'Apple Push Notifications',
  gcmEnabled: 'Google Cloud Messaging',
  environment: 'APNS Environment',

  // App Context
  region: 'Storage Region',
  userMetadataEvents: 'User Metadata Events',
  channelMetadataEvents: 'Channel Metadata Events',
  membershipEvents: 'Membership Events',
  referentialIntegrity: 'Referential Integrity',
  disallowGetAllUserMetadata: 'Restrict Get All Users',
  disallowGetAllChannelMetadata: 'Restrict Get All Channels',

  // Files
  maxFileSize: 'Maximum File Size',

  // Functions
  modules: 'Function Modules',
  totalFunctions: 'Total Functions',
  runningFunctions: 'Running Functions',

  // Events & Actions
  listeners: 'Event Listeners',
  actions: 'Actions',
  totalListeners: 'Total Listeners',
  totalActions: 'Total Actions',
  activeListeners: 'Active Listeners',
  activeActions: 'Active Actions',
};

export const REGION_LABELS: Record<string, string> = {
  'us-east-1': 'US East (N. Virginia)',
  'us-west-1': 'US West (Oregon)',
  'eu-central-1': 'EU Central (Frankfurt)',
  'ap-south-1': 'AP South (Mumbai)',
  'ap-northeast-1': 'AP Northeast (Tokyo)',
  'aws-iad-1': 'US East (N. Virginia)',
  'aws-pdx-1': 'US West (Oregon)',
  'aws-fra-1': 'EU Central (Frankfurt)',
  'aws-bom-1': 'AP South (Mumbai)',
  'aws-hnd-1': 'AP Northeast (Tokyo)',
};

export const REGION_ABBREVIATIONS: Record<string, string> = {
  'us-east-1': 'US-E',
  'us-west-1': 'US-W',
  'eu-central-1': 'EU-C',
  'ap-south-1': 'AP-S',
  'ap-northeast-1': 'AP-NE',
  'aws-iad-1': 'US-E',
  'aws-pdx-1': 'US-W',
  'aws-fra-1': 'EU-C',
  'aws-bom-1': 'AP-S',
  'aws-hnd-1': 'AP-NE',
};

export const RETENTION_LABELS: Record<number, string> = {
  1: '1 day',
  7: '7 days',
  30: '30 days',
  90: '90 days',
  180: '180 days (6 months)',
  365: '1 year',
  0: 'Unlimited',
};

export const RETENTION_ABBREVIATIONS: Record<number, string> = {
  1: '1d',
  7: '7d',
  30: '30d',
  90: '90d',
  180: '180d',
  365: '1y',
  0: '∞',
};

// Helper function to format retention period
export function formatRetention(days: number): string {
  return RETENTION_ABBREVIATIONS[days] || `${days}d`;
}

// Helper function to format region
export function formatRegion(region: string): string {
  return REGION_ABBREVIATIONS[region] || region;
}

// Helper function to get full region name
export function getRegionName(region: string): string {
  return REGION_LABELS[region] || region;
}

// Helper function to format boolean values
export function formatBoolean(value: boolean): string {
  return value ? 'Enabled' : 'Disabled';
}

// Helper function to format intervals
export function formatInterval(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

// Helper function to format TTL in minutes
export function formatTTL(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    return `${days} day${days > 1 ? 's' : ''}`;
  }
}
