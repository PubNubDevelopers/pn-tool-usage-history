import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string; // Now accepts hex color like "#E41A1C"
  subtitle?: string;
}

export default function StatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
  // Convert hex to rgb for the background with opacity
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  const rgb = hexToRgb(color);
  const bgColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;

  return (
    <div className="bg-pn-surface rounded-lg border border-pn-border p-5 h-32 flex flex-col">
      <div className="flex items-start justify-between mb-auto">
        <p className="text-sm font-medium text-pn-text-secondary">{title}</p>
        <div className="p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: bgColor }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
      <div className="mt-auto">
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        {subtitle && (
          <p className="text-xs text-pn-text-secondary mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
