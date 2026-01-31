import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'pink' | 'red';
  subtitle?: string;
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    icon: 'text-blue-500',
  },
  green: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    icon: 'text-emerald-500',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    icon: 'text-purple-500',
  },
  yellow: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    icon: 'text-amber-500',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    icon: 'text-pink-500',
  },
  red: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    icon: 'text-red-500',
  },
};

export default function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className="bg-pn-surface rounded-lg border border-pn-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-pn-text-secondary">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${colors.text}`}>{value}</p>
          {subtitle && (
            <p className="text-xs text-pn-text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
