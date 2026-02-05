import { UsageData, FeatureStatus, AppFeatures, MessagePersistenceConfig, PresenceConfig, AccessManagerConfig, PushConfig, AppContextConfig, FilesConfig, FunctionsConfig, EventsActionsConfig } from '../types';
import { sumMetrics } from './metrics';

/**
 * Detect which features are enabled based on keyset pnconfig
 * This is faster and more accurate than usage-based detection
 */
export function detectFeaturesFromConfig(keyset: any): FeatureStatus {
  // The config might be in different properties depending on the API version
  const config = keyset.pnconfig || keyset.config || keyset.properties || {};

  // Also check top-level properties as some APIs return them flat
  const checkConfig = (key: string): boolean => {
    return config[key] === true || config[key] === 1 || keyset[key] === true || keyset[key] === 1;
  };

  return {
    streamController: false, // Will be detected separately
    presence: checkConfig('presence'),
    history: checkConfig('storage') || checkConfig('history') || checkConfig('message_persistence'),
    accessManager: checkConfig('access_manager') || checkConfig('pam'),
    push: checkConfig('apns') || checkConfig('gcm') || checkConfig('w3c') || checkConfig('mpns') || checkConfig('push'),
    appContext: checkConfig('objects') || checkConfig('app_context'),
    files: checkConfig('files_enabled') || checkConfig('files'),
    // Functions, Events & Actions, and Illuminate are not in pnconfig, need to detect from usage
    functions: false,
    eventsActions: false,
    illuminate: false,
  };
}

/**
 * Parse Message Persistence config from internal admin API response
 */
export function parseMessagePersistenceConfig(apiResponse: any): MessagePersistenceConfig | null {
  try {
    // The keyset object has properties as a nested object
    const props = apiResponse?.properties || {};

    console.log('[parseMessagePersistenceConfig] properties keys sample:', Object.keys(props).slice(0, 30));

    // Helper to get value - skip objects with created/modified metadata
    const getValue = (key: string): any => {
      const val = props[key];
      if (val && typeof val === 'object' && ('created' in val || 'modified' in val)) {
        return undefined;
      }
      return val;
    };

    // Check if storage/history is enabled
    const storageVal = getValue('storage') ?? getValue('history') ?? getValue('message_storage_ttl');
    const enabled = storageVal === 1 || storageVal === true;

    console.log('[parseMessagePersistenceConfig] storage value:', storageVal, 'enabled:', enabled);
    if (!enabled) return null;

    // Get retention days
    const getRetention = (): number => {
      const fields = [
        'storage_retention_days', 'history_retention', 'retention_days',
        'storage_retention', 'message_retention', 'message_storage_ttl'
      ];

      for (const field of fields) {
        const value = getValue(field);
        if (value !== undefined && value !== null) {
          const parsed = parseInt(String(value));
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }

      return 30; // Default to 30 days if not specified
    };

    const checkFlag = (key: string): boolean => {
      const val = getValue(key);
      return val === 1 || val === true;
    };

    const config = {
      enabled: true,
      retentionDays: getRetention(),
      deleteFromHistory: checkFlag('delete_from_history') || checkFlag('storage_delete_enabled'),
      includePresenceEvents: checkFlag('include_presence_events') || checkFlag('presence_store_event_messages'),
    };

    console.log('[parseMessagePersistenceConfig] Final config:', config);
    return config;
  } catch (error) {
    console.error('Error parsing message persistence config:', error);
    return null;
  }
}

/**
 * Parse Presence config from internal admin API response
 */
export function parsePresenceConfig(apiResponse: any): PresenceConfig | null {
  try {
    // The keyset object has properties as a nested object with metadata
    // We need to check the properties object's keys for actual configuration
    const props = apiResponse?.properties || {};

    console.log('[parsePresenceConfig] Full apiResponse keys:', Object.keys(apiResponse).slice(0, 30));
    console.log('[parsePresenceConfig] properties type:', typeof props);
    console.log('[parsePresenceConfig] properties keys sample:', Object.keys(props).slice(0, 30));

    // Helper to get value - properties might be objects with created/modified, or direct values
    const getValue = (key: string): any => {
      const val = props[key];
      // If it's an object with created/modified, it's metadata not a value
      if (val && typeof val === 'object' && ('created' in val || 'modified' in val)) {
        return undefined;
      }
      return val;
    };

    // Check if presence is enabled (look for presence: 1 or presence: true)
    const presenceVal = getValue('presence');
    const enabled = presenceVal === 1 || presenceVal === true;

    console.log('[parsePresenceConfig] presence value:', presenceVal, 'enabled:', enabled);
    if (!enabled) return null;

    // Get integer values from properties
    const getIntValue = (key: string, defaultValue: number): number => {
      const val = getValue(key);
      if (val !== undefined && val !== null) {
        const parsed = parseInt(String(val));
        if (!isNaN(parsed)) return parsed;
      }
      return defaultValue;
    };

    const checkFlag = (key: string): boolean => {
      const val = getValue(key);
      return val === 1 || val === true;
    };

    const config = {
      enabled: true,
      interval: getIntValue('presence_interval', 30),
      announceMax: getIntValue('presence_announce_max', 20),
      debounce: getIntValue('presence_debounce', 0),
      deltas: checkFlag('presence_deltas'),
      generateLeaveOnDisconnect: checkFlag('presence_leave_on_disconnect'),
      streamFiltering: checkFlag('presence_stream_filtering'),
      activeNoticeChannel: getValue('presence_active_notice_channel') || getValue('active_notice_channel'),
    };

    console.log('[parsePresenceConfig] Final config:', config);
    return config;
  } catch (error) {
    console.error('Error parsing presence config:', error);
    return null;
  }
}

/**
 * Parse Access Manager config from internal admin API response
 */
export function parseAccessManagerConfig(apiResponse: any): AccessManagerConfig | null {
  try {
    const props = apiResponse?.properties || {};

    console.log('[parseAccessManagerConfig] properties keys sample:', Object.keys(props).slice(0, 30));

    const getValue = (key: string): any => {
      const val = props[key];
      if (val && typeof val === 'object' && ('created' in val || 'modified' in val)) {
        return undefined;
      }
      return val;
    };

    // Check if PAM is enabled
    const pamVal = getValue('pam') ?? getValue('access_manager');
    const enabled = pamVal === 1 || pamVal === true;

    console.log('[parseAccessManagerConfig] pam value:', pamVal, 'enabled:', enabled);
    if (!enabled) return null;

    const getIntValue = (key: string, defaultValue: number): number => {
      const val = getValue(key);
      if (val !== undefined && val !== null) {
        const parsed = parseInt(String(val));
        if (!isNaN(parsed)) return parsed;
      }
      return defaultValue;
    };

    const checkFlag = (key: string): boolean => {
      const val = getValue(key);
      return val === 1 || val === true;
    };

    const config = {
      enabled: true,
      ttl: getIntValue('pam_max_token_ttl', 1440), // Default 1440 minutes (24 hours)
      revokeEnabled: checkFlag('pam_revoke_token_enabled'),
    };

    console.log('[parseAccessManagerConfig] Final config:', config);
    return config;
  } catch (error) {
    console.error('Error parsing access manager config:', error);
    return null;
  }
}

/**
 * Parse Mobile Push config from internal admin API response
 */
export function parsePushConfig(apiResponse: any): PushConfig | null {
  try {
    const props = apiResponse?.properties || {};

    console.log('[parsePushConfig] properties keys sample:', Object.keys(props).slice(0, 30));

    const getValue = (key: string): any => {
      const val = props[key];
      if (val && typeof val === 'object' && ('created' in val || 'modified' in val)) {
        return undefined;
      }
      return val;
    };

    const checkFlag = (key: string): boolean => {
      const val = getValue(key);
      return val === 1 || val === true;
    };

    const apnsEnabled = checkFlag('apns');
    const gcmEnabled = checkFlag('gcm') || checkFlag('fcm');
    const w3cEnabled = checkFlag('w3c');
    const mpnsEnabled = checkFlag('mpns');

    // Only return config if at least one push service is enabled
    if (!apnsEnabled && !gcmEnabled && !w3cEnabled && !mpnsEnabled) {
      console.log('[parsePushConfig] No push services enabled');
      return null;
    }

    const config = {
      apns: {
        enabled: apnsEnabled,
        environment: getValue('apns_environment') as 'development' | 'production' | undefined,
      },
      gcm: {
        enabled: gcmEnabled,
      },
      w3c: w3cEnabled ? { enabled: true } : undefined,
      mpns: mpnsEnabled ? { enabled: true } : undefined,
    };

    console.log('[parsePushConfig] Final config:', config);
    return config;
  } catch (error) {
    console.error('Error parsing push config:', error);
    return null;
  }
}

/**
 * Parse App Context config from internal admin API response
 */
export function parseAppContextConfig(apiResponse: any): AppContextConfig | null {
  try {
    const props = apiResponse?.properties || {};

    console.log('[parseAppContextConfig] properties keys sample:', Object.keys(props).slice(0, 30));

    const getValue = (key: string): any => {
      const val = props[key];
      if (val && typeof val === 'object' && ('created' in val || 'modified' in val)) {
        return undefined;
      }
      return val;
    };

    // Check if objects/app context is enabled
    const objectsVal = getValue('objects') ?? getValue('app_context');
    const enabled = objectsVal === 1 || objectsVal === true;

    console.log('[parseAppContextConfig] objects value:', objectsVal, 'enabled:', enabled);
    if (!enabled) return null;

    const checkFlag = (key: string): boolean => {
      const val = getValue(key);
      return val === 1 || val === true;
    };

    const config = {
      enabled: true,
      region: getValue('objects_region') || getValue('app_context_region') || 'us-east-1',
      userMetadataEvents: checkFlag('objects_user_metadata_events') || checkFlag('user_metadata_events'),
      channelMetadataEvents: checkFlag('objects_channel_metadata_events') || checkFlag('channel_metadata_events'),
      membershipEvents: checkFlag('objects_membership_events') || checkFlag('membership_events'),
      referentialIntegrity: checkFlag('objects_ref_integrity') || checkFlag('referential_integrity'),
      disallowGetAllUserMetadata: checkFlag('pam_objects_disallow_getalluuids'),
      disallowGetAllChannelMetadata: checkFlag('pam_objects_disallow_getallchannels'),
    };

    console.log('[parseAppContextConfig] Final config:', config);
    return config;
  } catch (error) {
    console.error('Error parsing app context config:', error);
    return null;
  }
}

/**
 * Parse Files config from internal admin API response
 */
export function parseFilesConfig(apiResponse: any): FilesConfig | null {
  try {
    const props = apiResponse?.properties || {};

    console.log('[parseFilesConfig] properties keys sample:', Object.keys(props).slice(0, 30));

    const getValue = (key: string): any => {
      const val = props[key];
      if (val && typeof val === 'object' && ('created' in val || 'modified' in val)) {
        return undefined;
      }
      return val;
    };

    // Check if files is enabled
    const filesVal = getValue('files_enabled') ?? getValue('files');
    const enabled = filesVal === 1 || filesVal === true;

    console.log('[parseFilesConfig] files value:', filesVal, 'enabled:', enabled);
    if (!enabled) return null;

    const getIntValue = (key: string, defaultValue: number): number => {
      const val = getValue(key);
      if (val !== undefined && val !== null) {
        const parsed = parseInt(String(val));
        if (!isNaN(parsed)) return parsed;
      }
      return defaultValue;
    };

    const config = {
      enabled: true,
      retentionDays: getIntValue('files_retention_days', 30),
      region: getValue('files_region') || 'us-east-1',
    };

    console.log('[parseFilesConfig] Final config:', config);
    return config;
  } catch (error) {
    console.error('Error parsing files config:', error);
    return null;
  }
}

/**
 * Parse Functions configuration from API response
 * The internal admin API returns either:
 * 1. { modules: [...] } - array of function modules/packages
 * 2. Empty object {} or { modules: [] } if no functions configured
 */
export function parseFunctionsConfig(apiResponse: any): FunctionsConfig | null {
  try {
    console.log('[parseFunctionsConfig] Raw API response:', JSON.stringify(apiResponse).substring(0, 500));

    // Handle empty response
    if (!apiResponse || Object.keys(apiResponse).length === 0) {
      console.log('[parseFunctionsConfig] Empty response, no functions configured');
      return null;
    }

    const modules = apiResponse?.modules || [];
    console.log('[parseFunctionsConfig] Found modules:', modules.length);

    // If no modules, return null (no functions configured)
    if (modules.length === 0) {
      console.log('[parseFunctionsConfig] No modules found, returning null');
      return null;
    }

    let totalFunctions = 0;
    let runningFunctions = 0;

    const parsedModules = modules.map((module: any) => {
      // Functions can be in different fields depending on API version
      const functions = module.functions || module.function_revisions || [];
      console.log(`[parseFunctionsConfig] Module "${module.name}" has ${functions.length} functions`);

      totalFunctions += functions.length;

      // Check various fields for enabled status
      runningFunctions += functions.filter((f: any) => {
        // Function can be enabled via: enabled: true, status: 'RUNNING', state: 'RUNNING'
        const isEnabled = f.enabled === true ||
                         f.status === 'RUNNING' ||
                         f.state === 'RUNNING' ||
                         f.enabled === 1;
        return isEnabled;
      }).length;

      return {
        id: module.id,
        name: module.name || module.package_name || 'Unnamed Module',
        functions: functions.map((f: any) => ({
          id: f.id,
          name: f.name || f.function_name || 'Unnamed Function',
          type: f.type || f.function_type,
          enabled: f.enabled === true ||
                  f.status === 'RUNNING' ||
                  f.state === 'RUNNING' ||
                  f.enabled === 1,
        })),
      };
    });

    const config = {
      modules: parsedModules,
      totalModules: modules.length,
      totalFunctions,
      runningFunctions,
    };

    console.log('[parseFunctionsConfig] Final config:', JSON.stringify(config));
    return config;
  } catch (error) {
    console.error('[parseFunctionsConfig] Error parsing functions config:', error);
    return null;
  }
}

/**
 * Parse Events & Actions configuration from API response
 * The API returns listeners and actions with various status formats
 */
export function parseEventsActionsConfig(apiResponse: any): EventsActionsConfig | null {
  try {
    console.log('[parseEventsActionsConfig] Raw API response:', JSON.stringify(apiResponse).substring(0, 500));
    
    const listeners = apiResponse?.listeners || apiResponse?.event_listeners || [];
    const actions = apiResponse?.actions || [];

    console.log(`[parseEventsActionsConfig] Found ${listeners.length} listeners, ${actions.length} actions`);

    if (listeners.length === 0 && actions.length === 0) return null;

    // Helper to check if enabled - handles various API formats
    const isEnabled = (item: any): boolean => {
      if (item.enabled === true || item.enabled === 1) return true;
      if (item.status === 'on' || item.status === 'active' || item.status === 'running') return true;
      if (item.state === 'on' || item.state === 'active' || item.state === 'running') return true;
      return false;
    };

    const parsedListeners = listeners.map((listener: any) => ({
      id: listener.id,
      name: listener.name || listener.listener_name,
      event: listener.event || listener.source || listener.event_type,
      enabled: isEnabled(listener),
    }));

    const parsedActions = actions.map((action: any) => ({
      id: action.id,
      name: action.name || action.action_name,
      type: action.type || action.category || action.action_type,
      enabled: isEnabled(action),
    }));

    const runningListeners = parsedListeners.filter((l: any) => l.enabled).length;
    const runningActions = parsedActions.filter((a: any) => a.enabled).length;

    const config = {
      listeners: parsedListeners,
      actions: parsedActions,
      totalListeners: parsedListeners.length,
      totalActions: parsedActions.length,
      runningListeners,
      runningActions,
    };

    console.log('[parseEventsActionsConfig] Final config:', JSON.stringify(config));
    return config;
  } catch (error) {
    console.error('[parseEventsActionsConfig] Error:', error);
    return null;
  }
}

/**
 * Detect which features have been used based on usage metrics
 * Returns true if ANY usage detected for that feature
 */
export function detectFeatures(usage: UsageData): FeatureStatus {
  return {
    streamController: false, // Not detectable from usage metrics
    presence: hasPresence(usage),
    history: hasHistory(usage),
    accessManager: hasAccessManager(usage),
    push: hasPush(usage),
    appContext: hasAppContext(usage),
    files: hasFiles(usage),
    functions: hasFunctions(usage),
    eventsActions: hasEventsActions(usage),
    illuminate: hasIlluminate(usage),
  };
}

/**
 * Check if Presence feature has been used
 */
function hasPresence(usage: UsageData): boolean {
  const metrics = [
    'pres_pub',
    'transaction_presence_herenow',
    'transaction_presence_wherenow',
    'transaction_presence_setuserstate',
    'transaction_presence_getuserstate',
    'transaction_presence_heartbeats',
    'transaction_presence_leave',
    'presence_herenow_transactions',
    'presence_heartbeats_transactions',
    'presence_wherenow_transactions',
    'presence_setuserstate_transactions',
    'presence_getuserstate_transactions',
    'presence_leave_transactions',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Check if History/Message Persistence feature has been used
 */
function hasHistory(usage: UsageData): boolean {
  const metrics = [
    'history',
    'history_msgs',
    'history_ssl',
    'transaction_history',
    'transaction_history_messages_count',
    'history_transactions',
    'history_with_actions_transactions',
    'bytes_stored_messages',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Check if Access Manager feature has been used
 */
function hasAccessManager(usage: UsageData): boolean {
  const metrics = [
    'transaction_accessmanager_grants',
    'transaction_accessmanager_audits',
    'transaction_accessmanager_clienterrors',
    'accessmanager_grants_transactions',
    'accessmanager_audits_transactions',
    'accessmanager_grants_v3_transactions',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Check if Push Notifications feature has been used
 */
function hasPush(usage: UsageData): boolean {
  const metrics = [
    'transaction_apns_sent',
    'transaction_gcm_sent',
    'transaction_fcm_sent',
    'transaction_mpns_sent',
    'transaction_apns_removed',
    'transaction_gcm_removed',
    'transaction_fcm_removed',
    'transaction_mpns_removed',
    'transaction_push_device_writes',
    'transaction_push_device_reads',
    'apns_sent_transactions',
    'gcm_sent_transactions',
    'push',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Check if App Context (Objects API) feature has been used
 */
function hasAppContext(usage: UsageData): boolean {
  const metrics = [
    'transaction_objects_create_user',
    'transaction_objects_get_user',
    'transaction_objects_update_user',
    'transaction_objects_delete_user',
    'transaction_objects_get_all_users',
    'transaction_objects_create_space',
    'transaction_objects_get_space',
    'transaction_objects_update_space',
    'transaction_objects_delete_space',
    'transaction_objects_get_all_spaces',
    'transaction_objects_get_user_space_memberships',
    'transaction_objects_get_space_user_memberships',
    'transaction_objects_update_user_space_memberships',
    'transaction_objects_update_space_user_memberships',
    'transaction_internal_publish_objects',
    'bytes_stored_users',
    'bytes_stored_memberships',
    'bytes_stored_spaces',
    'objects_users',
    'objects_spaces',
    'objects_memberships',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Check if Files feature has been used
 */
function hasFiles(usage: UsageData): boolean {
  const metrics = [
    'transaction_files_publish',
    'transaction_files_get_file',
    'transaction_files_delete_file',
    'transaction_files_generate_url',
    'transaction_files_get_all_files',
    'transaction_files_clienterrors',
    'transaction_files_unauthorized',
    'files_publish_transactions',
    'files_get_file_transactions',
    'files_delete_file_transactions',
    'bytes_stored_files',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Check if Functions feature has been used
 */
function hasFunctions(usage: UsageData): boolean {
  const metrics = [
    'executions',
    'transaction_xhr',
    'transaction_kv_read',
    'transaction_kv_write',
    'kv_read_transactions',
    'kv_write_transactions',
    'xhr_transactions',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Check if Events & Actions feature has been used
 */
function hasEventsActions(usage: UsageData): boolean {
  const metrics = [
    'transaction_fire',
    'transaction_fire_client',
    'transaction_fire_eh',
    'fire_transactions',
    'fire_client_transactions',
    'fire_eh_transactions',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Check if Illuminate feature has been used
 */
function hasIlluminate(usage: UsageData): boolean {
  const metrics = [
    'events_ingested',
    'illuminate_events',
    'illuminate_ingestion',
  ];

  return metrics.some(metric => {
    const value = sumMetrics(usage[metric]);
    return value > 0;
  });
}

/**
 * Helper to check if any keyset in an app has a specific feature
 */
export function hasAnyFeature(app: AppFeatures, featureName: keyof FeatureStatus): boolean {
  return app.keysets.some(k => k.features[featureName]);
}
