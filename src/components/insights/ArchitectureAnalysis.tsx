import { DollarSign, Zap, TrendingUp, Lock, Shield } from 'lucide-react';
import { ArchitectureIssue } from '../../types';

interface ArchitectureAnalysisProps {
  issues: ArchitectureIssue[];
  score: number;
}

export default function ArchitectureAnalysis({ issues, score }: ArchitectureAnalysisProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (issues.length === 0) {
    return (
      <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
        <h3 className="text-lg font-semibold text-pn-text-primary mb-4">
          Architecture Health
        </h3>
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
          <p className="text-green-400 font-medium mb-1">
            Architecture Score: {score}/100
          </p>
          <p className="text-sm text-pn-text-secondary">
            No architecture issues detected - following PubNub best practices
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-pn-surface rounded-lg border border-pn-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-pn-text-primary">
          Architecture Health
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-pn-text-secondary text-sm">Score:</span>
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-pn-text-secondary">/100</span>
        </div>
      </div>

      <div className="space-y-4">
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
}

interface IssueCardProps {
  issue: ArchitectureIssue;
}

function IssueCard({ issue }: IssueCardProps) {
  const getCategoryIcon = () => {
    switch (issue.category) {
      case 'cost':
        return <DollarSign className="w-5 h-5" />;
      case 'performance':
        return <Zap className="w-5 h-5" />;
      case 'scalability':
        return <TrendingUp className="w-5 h-5" />;
      case 'security':
        return <Lock className="w-5 h-5" />;
      case 'reliability':
        return <Shield className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getSeverityBadge = () => {
    const colors = {
      high: 'bg-red-500/10 text-red-400 border-red-500/20',
      medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${colors[issue.severity]}`}>
        {issue.severity.toUpperCase()}
      </span>
    );
  };

  const getEffortBadge = () => {
    const colors = {
      low: 'bg-green-500/10 text-green-400',
      medium: 'bg-yellow-500/10 text-yellow-400',
      high: 'bg-red-500/10 text-red-400',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[issue.effort]}`}>
        {issue.effort} effort
      </span>
    );
  };

  const getCategoryColor = () => {
    switch (issue.category) {
      case 'cost':
        return 'text-yellow-400';
      case 'performance':
        return 'text-blue-400';
      case 'scalability':
        return 'text-purple-400';
      case 'security':
        return 'text-red-400';
      case 'reliability':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-5 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={getCategoryColor()}>{getCategoryIcon()}</div>
          <div>
            <h4 className="font-semibold text-pn-text-primary">{issue.title}</h4>
            <span className="text-xs text-pn-text-secondary capitalize">
              {issue.category}
            </span>
          </div>
        </div>
        {getSeverityBadge()}
      </div>

      <p className="text-sm text-pn-text-secondary mb-4">{issue.description}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-xs text-pn-text-secondary block mb-1">Current State:</span>
          <p className="text-sm text-pn-text-primary font-mono">{issue.currentValue}</p>
        </div>
        <div>
          <span className="text-xs text-pn-text-secondary block mb-1">Potential Impact:</span>
          <p className="text-sm text-pn-text-primary">{issue.potentialImpact}</p>
        </div>
      </div>

      <div className="p-3 bg-green-500/5 border border-green-500/10 rounded mb-3">
        <span className="text-xs text-pn-text-secondary block mb-1">Recommendation:</span>
        <p className="text-sm text-green-400">{issue.recommendation}</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-pn-text-secondary">
          Implementation: {getEffortBadge()}
        </div>
      </div>
    </div>
  );
}
