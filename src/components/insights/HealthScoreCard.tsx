import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HealthScore } from '../../types';

interface HealthScoreCardProps {
  healthScore: HealthScore;
}

export default function HealthScoreCard({ healthScore }: HealthScoreCardProps) {
  const { overall, components, trend } = healthScore;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-6 h-6 text-green-400" />;
      case 'declining':
        return <TrendingDown className="w-6 h-6 text-red-400" />;
      default:
        return <Minus className="w-6 h-6 text-gray-400" />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'improving':
        return 'Improving';
      case 'declining':
        return 'Declining';
      default:
        return 'Stable';
    }
  };

  return (
    <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-pn-text-primary">Account Health Score</h3>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <span className="text-sm text-pn-text-secondary">{getTrendText()}</span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className={`text-5xl font-bold ${getScoreColor(overall)}`}>{overall}</span>
          <span className="text-2xl text-pn-text-secondary">/100</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(overall)}`}
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      {/* Component Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <ComponentScore label="Growth" score={components.growth} />
        <ComponentScore label="Adoption" score={components.adoption} />
        <ComponentScore label="Efficiency" score={components.efficiency} />
        <ComponentScore label="Engagement" score={components.engagement} />
      </div>

      <div className="mt-4 pt-4 border-t border-pn-border">
        <p className="text-xs text-pn-text-secondary">
          Last calculated: {new Date(healthScore.calculatedAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}

interface ComponentScoreProps {
  label: string;
  score: number;
}

function ComponentScore({ label, score }: ComponentScoreProps) {
  const getColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <p className="text-xs text-pn-text-secondary mb-1">{label}</p>
      <p className={`text-2xl font-bold ${getColor(score)}`}>{score}</p>
    </div>
  );
}
