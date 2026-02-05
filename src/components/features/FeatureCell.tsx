import { MessagePersistenceConfig, PresenceConfig, AccessManagerConfig, PushConfig, AppContextConfig, FilesConfig, FunctionsConfig, EventsActionsConfig } from '../../types';
import { formatRetention, formatInterval, formatTTL, formatRegion } from '../../utils/featureLabels';
import { Loader2, AlertCircle } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import {
  MessagePersistenceTooltip,
  PresenceTooltip,
  AccessManagerTooltip,
  PushTooltip,
  AppContextTooltip,
  FilesTooltip,
  FunctionsTooltip,
  EventsActionsTooltip,
  BasicTooltip,
  LoadingTooltip,
  ErrorTooltip,
} from './FeatureTooltipContent';

interface FeatureCellProps {
  featureName: 'history' | 'presence' | 'accessManager' | 'push' | 'appContext' | 'files' | 'functions' | 'eventsActions';
  enabled: boolean;
  config?: MessagePersistenceConfig | PresenceConfig | AccessManagerConfig | PushConfig | AppContextConfig | FilesConfig | FunctionsConfig | EventsActionsConfig;
  isLoading?: boolean;
  error?: string;
  onHover?: () => void;
}

export default function FeatureCell({
  featureName,
  enabled,
  config,
  isLoading,
  error,
  onHover,
}: FeatureCellProps) {
  // Handle hover event
  const handleMouseEnter = () => {
    if (onHover && !config && !isLoading && !error) {
      onHover();
    }
  };

  // Determine what to display
  const getDisplayContent = () => {
    // If disabled, show dash
    if (!enabled) {
      return <span className="text-pn-text-secondary/30">-</span>;
    }

    // If loading, show spinner
    if (isLoading) {
      return <Loader2 className="w-4 h-4 text-pn-blue animate-spin mx-auto" />;
    }

    // If error, show warning icon with compact display if we have config
    if (error) {
      // Still try to show the value if we have config
      if (config) {
        if (featureName === 'history') {
          const historyConfig = config as MessagePersistenceConfig;
          return (
            <span className="text-yellow-500 font-medium text-sm" title={error}>
              {formatRetention(historyConfig.retentionDays)}
            </span>
          );
        }
        if (featureName === 'presence') {
          const presenceConfig = config as PresenceConfig;
          return (
            <span className="text-yellow-500 font-medium text-sm" title={error}>
              {presenceConfig.announceMax} / {formatInterval(presenceConfig.interval)}
            </span>
          );
        }
        if (featureName === 'accessManager') {
          const pamConfig = config as AccessManagerConfig;
          return (
            <span className="text-yellow-500 font-medium text-sm" title={error}>
              {formatTTL(pamConfig.ttl)} / {pamConfig.revokeEnabled ? 'Rev' : 'No Rev'}
            </span>
          );
        }
        if (featureName === 'push') {
          const pushConfig = config as PushConfig;
          return (
            <div className="flex items-center justify-center gap-1.5" title={error}>
              <span className={pushConfig.apns.enabled ? 'text-yellow-500' : 'text-pn-text-secondary/30'} style={{ fontSize: '16px' }}></span>
              <span className={pushConfig.gcm.enabled ? 'text-yellow-500' : 'text-pn-text-secondary/30'} style={{ fontSize: '16px' }}></span>
            </div>
          );
        }
        if (featureName === 'appContext') {
          const appContextConfig = config as AppContextConfig;
          return (
            <span className="text-yellow-500 font-medium text-sm" title={error}>
              {formatRegion(appContextConfig.region)}
            </span>
          );
        }
        if (featureName === 'files') {
          const filesConfig = config as FilesConfig;
          return (
            <span className="text-yellow-500 font-medium text-sm" title={error}>
              {formatRetention(filesConfig.retentionDays)} / {formatRegion(filesConfig.region)}
            </span>
          );
        }
        if (featureName === 'functions') {
          const functionsConfig = config as FunctionsConfig;
          return (
            <div className="flex items-center justify-center gap-1 text-sm" title={error}>
              <span className="text-pn-text-secondary text-xs">M:</span>
              <span className="text-yellow-500 font-medium">{functionsConfig.totalModules}</span>
              <span className="text-pn-text-secondary">/</span>
              <span className="text-pn-text-secondary text-xs">F:</span>
              <span className="text-yellow-500 font-medium">{functionsConfig.totalFunctions}</span>
            </div>
          );
        }
        if (featureName === 'eventsActions') {
          const eventsActionsConfig = config as EventsActionsConfig;
          return (
            <div className="flex items-center justify-center gap-1 text-sm" title={error}>
              <span className="text-pn-text-secondary text-xs">E:</span>
              <span className="text-yellow-500 font-medium">{eventsActionsConfig.totalListeners}</span>
              <span className="text-pn-text-secondary">/</span>
              <span className="text-pn-text-secondary text-xs">A:</span>
              <span className="text-yellow-500 font-medium">{eventsActionsConfig.totalActions}</span>
            </div>
          );
        }
      }
      return <AlertCircle className="w-4 h-4 text-yellow-500 mx-auto" />;
    }

    // Feature-specific displays - always show if we have config
    if (featureName === 'history') {
      const historyConfig = config as MessagePersistenceConfig;
      if (historyConfig) {
        return (
          <span className="text-green-500 font-medium text-sm">
            {formatRetention(historyConfig.retentionDays)}
          </span>
        );
      }
    }

    if (featureName === 'presence') {
      const presenceConfig = config as PresenceConfig;
      if (presenceConfig) {
        return (
          <span className="text-green-500 font-medium text-sm whitespace-nowrap">
            {presenceConfig.announceMax} / {formatInterval(presenceConfig.interval)}
          </span>
        );
      }
    }

    if (featureName === 'accessManager') {
      const pamConfig = config as AccessManagerConfig;
      if (pamConfig) {
        return (
          <div className="flex items-center justify-center gap-1 text-sm whitespace-nowrap">
            <span className="text-green-500 font-medium">{formatTTL(pamConfig.ttl)}</span>
            <span className="text-pn-text-secondary">/</span>
            <span className={pamConfig.revokeEnabled ? 'text-green-500' : 'text-red-400'}>
              {pamConfig.revokeEnabled ? 'Rev' : 'No Rev'}
            </span>
          </div>
        );
      }
    }

    if (featureName === 'push') {
      const pushConfig = config as PushConfig;
      if (pushConfig) {
        return (
          <div className="flex items-center justify-center gap-1.5">
            <span className={pushConfig.apns.enabled ? 'text-green-500' : 'text-pn-text-secondary/30'} title="Apple Push" style={{ fontSize: '16px' }}>

            </span>
            <span className={pushConfig.gcm.enabled ? 'text-green-500' : 'text-pn-text-secondary/30'} title="Android Push" style={{ fontSize: '16px' }}>

            </span>
          </div>
        );
      }
    }

    if (featureName === 'appContext') {
      const appContextConfig = config as AppContextConfig;
      if (appContextConfig) {
        return (
          <span className="text-green-500 font-medium text-sm">
            {formatRegion(appContextConfig.region)}
          </span>
        );
      }
    }

    if (featureName === 'files') {
      const filesConfig = config as FilesConfig;
      if (filesConfig) {
        return (
          <div className="flex items-center justify-center gap-1 text-sm whitespace-nowrap">
            <span className="text-green-500 font-medium">{formatRetention(filesConfig.retentionDays)}</span>
            <span className="text-pn-text-secondary">/</span>
            <span className="text-green-500 font-medium">{formatRegion(filesConfig.region)}</span>
          </div>
        );
      }
    }

    if (featureName === 'functions') {
      const functionsConfig = config as FunctionsConfig;
      if (functionsConfig) {
        const hasRunning = functionsConfig.runningFunctions > 0;
        const colorClass = hasRunning ? 'text-green-500' : 'text-pn-text-secondary';
        return (
          <span className={`${colorClass} font-medium text-sm whitespace-nowrap`}>
            M{functionsConfig.totalModules}/F{functionsConfig.totalFunctions}
          </span>
        );
      }
    }

    if (featureName === 'eventsActions') {
      const eventsActionsConfig = config as EventsActionsConfig;
      if (eventsActionsConfig) {
        const hasRunning = eventsActionsConfig.runningListeners > 0 || eventsActionsConfig.runningActions > 0;
        const colorClass = hasRunning ? 'text-green-500' : 'text-pn-text-secondary';
        return (
          <span className={`${colorClass} font-medium text-sm whitespace-nowrap`}>
            E{eventsActionsConfig.totalListeners}/A{eventsActionsConfig.totalActions}
          </span>
        );
      }
    }

    // Fallback - should rarely be shown now
    return <span className="text-green-500 text-xs">✓</span>;
  };

  // Get tooltip content
  const getTooltipContent = () => {
    const titles = {
      history: 'Message Persistence',
      presence: 'Presence',
      accessManager: 'Access Manager',
      push: 'Mobile Push',
      appContext: 'App Context',
      files: 'Files',
      functions: 'Functions',
      eventsActions: 'Events & Actions',
    };
    const title = titles[featureName];

    if (isLoading) {
      return <LoadingTooltip title={title} />;
    }

    if (error) {
      return <ErrorTooltip title={title} error={error} />;
    }

    if (!enabled) {
      return <BasicTooltip title={title} enabled={false} />;
    }

    if (!config) {
      return <BasicTooltip title={title} enabled={true} />;
    }

    if (featureName === 'history') {
      return <MessagePersistenceTooltip config={config as MessagePersistenceConfig} />;
    }

    if (featureName === 'presence') {
      return <PresenceTooltip config={config as PresenceConfig} />;
    }

    if (featureName === 'accessManager') {
      return <AccessManagerTooltip config={config as AccessManagerConfig} />;
    }

    if (featureName === 'push') {
      return <PushTooltip config={config as PushConfig} />;
    }

    if (featureName === 'appContext') {
      return <AppContextTooltip config={config as AppContextConfig} />;
    }

    if (featureName === 'files') {
      return <FilesTooltip config={config as FilesConfig} />;
    }

    if (featureName === 'functions') {
      return <FunctionsTooltip config={config as FunctionsConfig} />;
    }

    if (featureName === 'eventsActions') {
      return <EventsActionsTooltip config={config as EventsActionsConfig} />;
    }

    return <BasicTooltip title={title} enabled={enabled} />;
  };

  // Don't show tooltip for disabled features
  if (!enabled) {
    return (
      <div className="flex items-center justify-center">
        <span className="text-pn-text-secondary/30">-</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
    >
      <Tooltip content={getTooltipContent()} position="top" maxWidth={320}>
        <div className="cursor-help">{getDisplayContent()}</div>
      </Tooltip>
    </div>
  );
}
