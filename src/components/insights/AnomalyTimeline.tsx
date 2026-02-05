import { AlertTriangle, TrendingUp, TrendingDown, XCircle } from 'lucide-react';
import { Anomaly } from '../../types';
import { formatNumber } from '../../utils/metrics';

interface AnomalyTimelineProps {
  anomalies: Anomaly[];
  onAnomalyClick?: (anomaly: Anomaly) => void;
}

export default function AnomalyTimeline({ anomalies, onAnomalyClick }: AnomalyTimelineProps) {
  if (anomalies.length === 0) {
    return (
      <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
        <h3 className="text-lg font-semibold text-pn-text-primary mb-4">Anomaly Detection</h3>
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-green-400 font-medium">No anomalies detected</p>
          <p className="text-sm text-pn-text-secondary mt-1">
            Usage patterns look normal for the selected date range
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-pn-text-primary">Anomaly Detection</h3>
        <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-sm font-medium">
          {anomalies.length} detected
        </span>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {anomalies.map((anomaly, idx) => (
          <AnomalyCard
            key={idx}
            anomaly={anomaly}
            onClick={() => onAnomalyClick?.(anomaly)}
          />
        ))}
      </div>
    </div>
  );
}

interface AnomalyCardProps {
  anomaly: Anomaly;
  onClick?: () => void;
}

function AnomalyCard({ anomaly, onClick }: AnomalyCardProps) {
  const getSeverityColor = () => {
    switch (anomaly.severity) {
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500',
          text: 'text-red-400',
          icon: 'text-red-500',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500',
          text: 'text-yellow-400',
          icon: 'text-yellow-500',
        };
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500',
          text: 'text-blue-400',
          icon: 'text-blue-500',
        };
    }
  };

  const getTypeIcon = () => {
    switch (anomaly.type) {
      case 'spike':
        return <TrendingUp className="w-5 h-5" />;
      case 'drop':
        return <TrendingDown className="w-5 h-5" />;
      case 'zero':
        return <XCircle className="w-5 h-5" />;
      default:
        return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const colors = getSeverityColor();

  return (
    <div
      className={`border-l-4 ${colors.border} ${colors.bg} rounded-r-lg p-4 cursor-pointer hover:opacity-80 transition-opacity`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className={colors.icon}>{getTypeIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${colors.text} uppercase text-xs`}>
                {anomaly.severity}
              </span>
              <span className="text-pn-text-secondary text-sm">
                {anomaly.date.toLocaleDateString()}
              </span>
            </div>
          </div>

          <p className="font-medium text-pn-text-primary mb-1">{anomaly.metric}</p>

          <div className="flex items-center gap-4 text-sm text-pn-text-secondary mb-2">
            <span>
              Value: <span className="text-pn-text-primary font-mono">{formatNumber(anomaly.value)}</span>
            </span>
            <span>
              Expected: <span className="text-pn-text-primary font-mono">{formatNumber(anomaly.expected)}</span>
            </span>
          </div>

          {anomaly.explanation && (
            <p className="text-sm text-pn-text-secondary italic">{anomaly.explanation}</p>
          )}
        </div>
      </div>
    </div>
  );
}
