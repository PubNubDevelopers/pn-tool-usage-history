import {
  StreamControllerConfig,
  MessagePersistenceConfig,
  PresenceConfig,
  AccessManagerConfig,
  PushConfig,
  AppContextConfig,
  FilesConfig,
  FunctionsConfig,
  EventsActionsConfig,
} from '../../types';
import {
  FEATURE_LABELS,
  getRegionName,
  formatBoolean,
  formatInterval,
  formatTTL,
  RETENTION_LABELS,
} from '../../utils/featureLabels';

interface PropertyRow {
  label: string;
  value: string | React.ReactNode;
  highlight?: boolean;
}

interface PropertyListProps {
  title?: string;
  properties: PropertyRow[];
}

function PropertyList({ title, properties }: PropertyListProps) {
  return (
    <div className="space-y-1">
      {title && <div className="font-semibold text-white mb-2">{title}</div>}
      {properties.map((prop, index) => (
        <div key={index} className="flex justify-between gap-4">
          <span className="text-pn-text-secondary">{prop.label}:</span>
          <span
            className={`font-medium ${
              prop.highlight ? 'text-green-500' : 'text-white'
            }`}
          >
            {prop.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StreamControllerTooltip({ config }: { config: StreamControllerConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.wildcardSubscribe,
      value: formatBoolean(config.wildcardSubscribeEnabled),
      highlight: config.wildcardSubscribeEnabled,
    },
    {
      label: FEATURE_LABELS.channelGroupLimit,
      value: config.channelGroupLimit.toLocaleString(),
    },
  ];

  return <PropertyList title="Stream Controller" properties={properties} />;
}

export function MessagePersistenceTooltip({ config }: { config: MessagePersistenceConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.enabled,
      value: formatBoolean(config.enabled),
      highlight: config.enabled,
    },
    {
      label: FEATURE_LABELS.retentionDays,
      value: RETENTION_LABELS[config.retentionDays] || `${config.retentionDays} days`,
    },
    {
      label: FEATURE_LABELS.deleteFromHistory,
      value: formatBoolean(config.deleteFromHistory),
      highlight: config.deleteFromHistory,
    },
    {
      label: FEATURE_LABELS.includePresenceEvents,
      value: formatBoolean(config.includePresenceEvents),
      highlight: config.includePresenceEvents,
    },
  ];

  return <PropertyList title="Message Persistence" properties={properties} />;
}

export function PresenceTooltip({ config }: { config: PresenceConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.enabled,
      value: formatBoolean(config.enabled),
      highlight: config.enabled,
    },
    {
      label: FEATURE_LABELS.interval,
      value: formatInterval(config.interval),
    },
    {
      label: FEATURE_LABELS.announceMax,
      value: config.announceMax.toString(),
    },
    {
      label: FEATURE_LABELS.debounce,
      value: formatInterval(config.debounce),
    },
    {
      label: FEATURE_LABELS.deltas,
      value: formatBoolean(config.deltas),
      highlight: config.deltas,
    },
    {
      label: FEATURE_LABELS.generateLeaveOnDisconnect,
      value: formatBoolean(config.generateLeaveOnDisconnect),
      highlight: config.generateLeaveOnDisconnect,
    },
    {
      label: FEATURE_LABELS.streamFiltering,
      value: formatBoolean(config.streamFiltering),
      highlight: config.streamFiltering,
    },
  ];

  if (config.activeNoticeChannel) {
    properties.push({
      label: FEATURE_LABELS.activeNoticeChannel,
      value: config.activeNoticeChannel,
    });
  }

  return <PropertyList title="Presence" properties={properties} />;
}

export function AccessManagerTooltip({ config }: { config: AccessManagerConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.enabled,
      value: formatBoolean(config.enabled),
      highlight: config.enabled,
    },
    {
      label: FEATURE_LABELS.ttl,
      value: formatTTL(config.ttl),
    },
    {
      label: FEATURE_LABELS.revokeEnabled,
      value: formatBoolean(config.revokeEnabled),
      highlight: config.revokeEnabled,
    },
  ];

  return <PropertyList title="Access Manager" properties={properties} />;
}

export function PushTooltip({ config }: { config: PushConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.apnsEnabled,
      value: formatBoolean(config.apns.enabled),
      highlight: config.apns.enabled,
    },
  ];

  if (config.apns.environment) {
    properties.push({
      label: FEATURE_LABELS.environment,
      value: config.apns.environment.charAt(0).toUpperCase() + config.apns.environment.slice(1),
    });
  }

  properties.push({
    label: FEATURE_LABELS.gcmEnabled,
    value: formatBoolean(config.gcm.enabled),
    highlight: config.gcm.enabled,
  });

  if (config.w3c) {
    properties.push({
      label: 'Web Push (W3C)',
      value: formatBoolean(config.w3c.enabled),
      highlight: config.w3c.enabled,
    });
  }

  if (config.mpns) {
    properties.push({
      label: 'Windows Push (MPNS)',
      value: formatBoolean(config.mpns.enabled),
      highlight: config.mpns.enabled,
    });
  }

  return <PropertyList title="Mobile Push" properties={properties} />;
}

export function AppContextTooltip({ config }: { config: AppContextConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.enabled,
      value: formatBoolean(config.enabled),
      highlight: config.enabled,
    },
    {
      label: FEATURE_LABELS.region,
      value: getRegionName(config.region),
    },
    {
      label: FEATURE_LABELS.userMetadataEvents,
      value: formatBoolean(config.userMetadataEvents),
      highlight: config.userMetadataEvents,
    },
    {
      label: FEATURE_LABELS.channelMetadataEvents,
      value: formatBoolean(config.channelMetadataEvents),
      highlight: config.channelMetadataEvents,
    },
    {
      label: FEATURE_LABELS.membershipEvents,
      value: formatBoolean(config.membershipEvents),
      highlight: config.membershipEvents,
    },
    {
      label: FEATURE_LABELS.referentialIntegrity,
      value: formatBoolean(config.referentialIntegrity),
      highlight: config.referentialIntegrity,
    },
  ];

  if (config.disallowGetAllUserMetadata !== undefined) {
    properties.push({
      label: FEATURE_LABELS.disallowGetAllUserMetadata,
      value: formatBoolean(config.disallowGetAllUserMetadata),
    });
  }

  if (config.disallowGetAllChannelMetadata !== undefined) {
    properties.push({
      label: FEATURE_LABELS.disallowGetAllChannelMetadata,
      value: formatBoolean(config.disallowGetAllChannelMetadata),
    });
  }

  return <PropertyList title="App Context" properties={properties} />;
}

export function FilesTooltip({ config }: { config: FilesConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.enabled,
      value: formatBoolean(config.enabled),
      highlight: config.enabled,
    },
    {
      label: FEATURE_LABELS.retentionDays,
      value: RETENTION_LABELS[config.retentionDays] || `${config.retentionDays} days`,
    },
    {
      label: FEATURE_LABELS.region,
      value: getRegionName(config.region),
    },
    {
      label: FEATURE_LABELS.maxFileSize,
      value: '5 MB',
    },
  ];

  return <PropertyList title="Files" properties={properties} />;
}

export function FunctionsTooltip({ config }: { config: FunctionsConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.modules,
      value: config.totalModules.toString(),
    },
    {
      label: FEATURE_LABELS.totalFunctions,
      value: config.totalFunctions.toString(),
    },
    {
      label: FEATURE_LABELS.runningFunctions,
      value: config.runningFunctions.toString(),
      highlight: config.runningFunctions > 0,
    },
  ];

  return (
    <div className="space-y-3">
      <PropertyList title="Functions" properties={properties} />
      {config.modules.length > 0 && (
        <div>
          <div className="font-semibold text-white mb-2">Modules:</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {config.modules.map((module) => {
              const runningCount = module.functions.filter((f) => f.enabled).length;
              return (
                <div key={module.id} className="text-xs">
                  <div className="font-medium text-white">{module.name}</div>
                  <div className="text-pn-text-secondary ml-2">
                    {module.functions.length} functions ({runningCount} running)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function EventsActionsTooltip({ config }: { config: EventsActionsConfig }) {
  const properties: PropertyRow[] = [
    {
      label: FEATURE_LABELS.totalListeners,
      value: config.totalListeners.toString(),
    },
    {
      label: FEATURE_LABELS.totalActions,
      value: config.totalActions.toString(),
    },
    {
      label: FEATURE_LABELS.activeListeners,
      value: config.runningListeners.toString(),
      highlight: config.runningListeners > 0,
    },
    {
      label: FEATURE_LABELS.activeActions,
      value: config.runningActions.toString(),
      highlight: config.runningActions > 0,
    },
  ];

  return <PropertyList title="Events & Actions" properties={properties} />;
}

// Error/fallback tooltip
export function BasicTooltip({ title, enabled }: { title: string; enabled: boolean }) {
  return (
    <div>
      <div className="font-semibold text-white mb-1">{title}</div>
      <div className={`${enabled ? 'text-green-500' : 'text-pn-text-secondary'}`}>
        {formatBoolean(enabled)}
      </div>
    </div>
  );
}

// Loading tooltip
export function LoadingTooltip({ title }: { title: string }) {
  return (
    <div>
      <div className="font-semibold text-white mb-1">{title}</div>
      <div className="text-pn-text-secondary">Loading details...</div>
    </div>
  );
}

// Error tooltip
export function ErrorTooltip({ title, error }: { title: string; error?: string }) {
  return (
    <div>
      <div className="font-semibold text-white mb-1">{title}</div>
      <div className="text-red-400">
        {error || 'Unable to load details'}
      </div>
    </div>
  );
}
