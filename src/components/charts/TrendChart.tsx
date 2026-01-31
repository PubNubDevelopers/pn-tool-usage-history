import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ChartDataPoint } from '../../types';
import { formatNumber } from '../../utils/metrics';

interface TrendChartProps {
  data: ChartDataPoint[];
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export default function TrendChart({ data, granularity = 'day' }: TrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-pn-text-secondary">
        No data available for the selected period
      </div>
    );
  }

  // Format date for display based on granularity
  const formatDate = (dateStr: string) => {
    if (dateStr.includes('Q')) {
      // Quarter format: "2025-Q1"
      return dateStr;
    }
    
    const date = new Date(dateStr);
    
    switch (granularity) {
      case 'year':
        return date.getFullYear().toString();
      case 'quarter':
        return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      case 'week':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorReplicated" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorEdge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorSignals" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          stroke="#94a3b8"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickLine={{ stroke: '#2d2d44' }}
          axisLine={{ stroke: '#2d2d44' }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(value) => formatNumber(value)}
          stroke="#94a3b8"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickLine={{ stroke: '#2d2d44' }}
          axisLine={{ stroke: '#2d2d44' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a2e',
            border: '1px solid #2d2d44',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#ffffff' }}
          itemStyle={{ color: '#94a3b8' }}
          labelFormatter={(label) => {
            const date = new Date(label);
            return date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }}
          formatter={(value: number) => [value.toLocaleString(), '']}
        />
        <Legend
          wrapperStyle={{ paddingTop: '20px' }}
          formatter={(value) => <span style={{ color: '#94a3b8' }}>{value}</span>}
        />
        <Area
          type="monotone"
          dataKey="replicated"
          name="Replicated"
          stroke="#8b5cf6"
          fillOpacity={1}
          fill="url(#colorReplicated)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="edge"
          name="Edge"
          stroke="#f59e0b"
          fillOpacity={1}
          fill="url(#colorEdge)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="signals"
          name="Signals"
          stroke="#ec4899"
          fillOpacity={1}
          fill="url(#colorSignals)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
