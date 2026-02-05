import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { FeatureBreakdown } from '../../types';
import { formatNumber } from '../../utils/metrics';
import { CHART_COLORS } from '../../config/chartColors';

interface ApiBreakdownChartProps {
  data: FeatureBreakdown[];
}

export default function ApiBreakdownChart({ data }: ApiBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-pn-text-secondary">
        No data available
      </div>
    );
  }

  // Take top 10 features
  const chartData = data.slice(0, 10);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(value) => formatNumber(value)}
          stroke="#94a3b8"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickLine={{ stroke: '#2d2d44' }}
          axisLine={{ stroke: '#2d2d44' }}
        />
        <YAxis
          type="category"
          dataKey="feature"
          stroke="#94a3b8"
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          tickLine={{ stroke: '#2d2d44' }}
          axisLine={{ stroke: '#2d2d44' }}
          width={95}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a2e',
            border: '1px solid #2d2d44',
            borderRadius: '8px',
          }}
          labelStyle={{ color: '#ffffff' }}
          formatter={(value: number) => [value.toLocaleString(), 'Transactions']}
        />
        <Bar dataKey="transactions" radius={[0, 4, 4, 0]}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
