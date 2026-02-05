import { useState } from 'react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChartDataPoint } from '../../types';
import { formatNumber } from '../../utils/metrics';
import { Eye, EyeOff, LineChart as LineChartIcon, BarChart3, BarChart4, PieChart as PieChartIcon } from 'lucide-react';
import { METRIC_COLORS } from '../../config/chartColors';

interface TrendChartProps {
  data: ChartDataPoint[];
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

type ChartType = 'line' | 'bar' | 'stacked-bar' | 'pie';

// Metric configuration for reusability
const METRICS = [
  { key: 'total', name: 'Total Transactions', color: METRIC_COLORS.total, gradientId: 'colorTotal' },
  { key: 'replicated', name: 'Replicated', color: METRIC_COLORS.replicated, gradientId: 'colorReplicated' },
  { key: 'edge', name: 'Edge', color: METRIC_COLORS.edge, gradientId: 'colorEdge' },
  { key: 'signals', name: 'Signals', color: METRIC_COLORS.signals, gradientId: 'colorSignals' },
  { key: 'functions', name: 'Functions', color: METRIC_COLORS.functions, gradientId: 'colorFunctions' },
  { key: 'messageActions', name: 'Message Actions', color: METRIC_COLORS.messageActions, gradientId: 'colorMessageActions' },
  { key: 'mau', name: 'MAU', color: METRIC_COLORS.mau, gradientId: 'colorMAU' },
] as const;

// Custom Tooltip with color-coded metric names
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  // Get metric color by key or from payload
  const getMetricColor = (dataKey: string, payloadColor?: string): string => {
    if (payloadColor) return payloadColor;
    const metric = METRICS.find(m => m.key === dataKey);
    return metric?.color || '#94a3b8';
  };

  // Format label
  const formatLabel = (label: string) => {
    if (!label) return '';
    if (typeof label === 'string' && label.includes('Q')) {
      return label;
    }
    const date = new Date(label);
    if (isNaN(date.getTime())) {
      return label;
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Check if this is pie chart data (has color property)
  const isPieChart = payload[0]?.payload?.color !== undefined;

  return (
    <div
      style={{
        backgroundColor: '#1a1a2e',
        border: '1px solid #2d2d44',
        borderRadius: '8px',
        padding: '12px',
      }}
    >
      {label && !isPieChart && (
        <p style={{ color: '#ffffff', marginBottom: '8px', fontWeight: '500' }}>
          {formatLabel(label)}
        </p>
      )}
      {payload.map((entry: any, index: number) => {
        // Get color from stroke, fill, or payload
        const entryColor = entry.stroke || entry.fill || entry.payload?.color || entry.color;
        const metricColor = getMetricColor(entry.dataKey, entryColor);
        
        return (
          <div key={index} style={{ padding: '2px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: metricColor, fontWeight: '600' }}>
              {entry.name}
            </span>
            <span style={{ color: '#94a3b8' }}>:</span>
            <span style={{ color: '#ffffff', fontWeight: '500' }}>
              {formatNumber(entry.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function TrendChart({ data, granularity = 'day' }: TrendChartProps) {
  const [visibleMetrics, setVisibleMetrics] = useState({
    total: true,
    replicated: true,
    edge: true,
    signals: true,
    functions: true,
    messageActions: true,
    mau: true,
  });

  const [showIndividualCharts, setShowIndividualCharts] = useState(false);
  const [chartType, setChartType] = useState<ChartType>('line');

  const toggleMetric = (metric: keyof typeof visibleMetrics) => {
    setVisibleMetrics(prev => ({ ...prev, [metric]: !prev[metric] }));
  };

  const toggleAll = () => {
    const allVisible = Object.values(visibleMetrics).every(v => v);
    const newState = Object.keys(visibleMetrics).reduce((acc, key) => {
      acc[key as keyof typeof visibleMetrics] = !allVisible;
      return acc;
    }, {} as typeof visibleMetrics);
    setVisibleMetrics(newState);
  };

  if (data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-pn-text-secondary">
        No data available for the selected period
      </div>
    );
  }

  // Calculate cumulative totals for the period
  const calculateTotal = (key: string): number => {
    return data.reduce((sum, point) => sum + (point[key as keyof ChartDataPoint] as number || 0), 0);
  };

  const totals = {
    total: calculateTotal('total'),
    replicated: calculateTotal('replicated'),
    edge: calculateTotal('edge'),
    signals: calculateTotal('signals'),
    functions: calculateTotal('functions'),
    messageActions: calculateTotal('messageActions'),
    mau: Math.max(...data.map(d => d.mau || 0)), // MAU is max, not sum
  };

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

  // Render an individual chart for a single metric
  const renderIndividualChart = (metric: typeof METRICS[number]) => {
    const gradientId = `colorIndividual${metric.key}`;
    const metricTotal = totals[metric.key as keyof typeof totals];
    
    return (
      <div key={metric.key} className="mt-6">
        <div className="flex items-center justify-between mb-2 px-2">
          <h4 className="text-sm font-medium text-pn-text-secondary">
            {metric.name}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-pn-text-secondary">Period Total:</span>
            <span className="text-sm font-semibold text-white">
              {formatNumber(metricTotal)}
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
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
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={metric.key}
              name={metric.name}
              stroke={metric.color}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              strokeWidth={2}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div>
      {/* Period Totals */}
      <div className="mb-4 flex flex-wrap gap-4">
        {METRICS.filter(metric => visibleMetrics[metric.key as keyof typeof visibleMetrics]).map((metric) => (
          <div key={metric.key} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: metric.color }}
            />
            <span className="text-sm text-pn-text-secondary">{metric.name}:</span>
            <span className="text-sm font-semibold text-white">
              {formatNumber(totals[metric.key as keyof typeof totals])}
            </span>
          </div>
        ))}
      </div>

      {/* Controls Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          <label className={`flex items-center gap-2 text-sm text-pn-text-secondary transition-colors ${
            chartType === 'pie' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:text-white'
          }`}>
            <input
              type="checkbox"
              checked={showIndividualCharts}
              onChange={(e) => setShowIndividualCharts(e.target.checked)}
              disabled={chartType === 'pie'}
              className="w-4 h-4 rounded border-pn-border bg-pn-bg-secondary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            />
            Show individual charts
          </label>
          
          {/* Chart Type Selector */}
          <div className="flex gap-1 border-l border-pn-border pl-4">
            {[
              { type: 'line' as ChartType, icon: LineChartIcon, label: 'Line' },
              { type: 'bar' as ChartType, icon: BarChart3, label: 'Bar' },
              { type: 'stacked-bar' as ChartType, icon: BarChart4, label: 'Stacked' },
              { type: 'pie' as ChartType, icon: PieChartIcon, label: 'Pie' },
            ].map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                  chartType === type
                    ? 'bg-pn-blue text-white'
                    : 'text-pn-text-secondary hover:bg-pn-surface-light hover:text-white'
                }`}
                title={`${label} chart`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
        
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-pn-text-secondary hover:text-white transition-colors"
        >
          {Object.values(visibleMetrics).every(v => v) ? (
            <>
              <EyeOff className="w-4 h-4" />
              Hide All
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Show All
            </>
          )}
        </button>
      </div>

      {chartType === 'pie' ? (
        // Pie Chart
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={METRICS.filter(m => visibleMetrics[m.key as keyof typeof visibleMetrics] && totals[m.key as keyof typeof totals] > 0).map(metric => ({
                name: metric.name,
                value: totals[metric.key as keyof typeof totals],
                color: metric.color,
              }))}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent, cx, cy, midAngle, innerRadius, outerRadius }) => {
                // Hide label if slice is too small (< 2%)
                if (percent < 0.02) return null;
                
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 25;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                
                return (
                  <text
                    x={x}
                    y={y}
                    fill="#ffffff"
                    textAnchor={x > cx ? 'start' : 'end'}
                    dominantBaseline="central"
                    style={{ fontSize: '12px', fontWeight: '500' }}
                  >
                    {`${name}: ${(percent * 100).toFixed(1)}%`}
                  </text>
                );
              }}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {METRICS.filter(m => visibleMetrics[m.key as keyof typeof visibleMetrics] && totals[m.key as keyof typeof totals] > 0).map((metric, index) => (
                <Cell key={`cell-${index}`} fill={metric.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value, entry: any) => (
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : chartType === 'bar' || chartType === 'stacked-bar' ? (
        // Bar Chart
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              onClick={(e) => {
                const dataKey = e.dataKey as keyof typeof visibleMetrics;
                toggleMetric(dataKey);
              }}
              formatter={(value, entry: any) => {
                const dataKey = entry.dataKey as keyof typeof visibleMetrics;
                const isVisible = visibleMetrics[dataKey];
                return (
                  <span 
                    style={{ 
                      color: isVisible ? '#94a3b8' : '#4b5563',
                      cursor: 'pointer',
                      textDecoration: isVisible ? 'none' : 'line-through',
                      opacity: isVisible ? 1 : 0.5,
                    }}
                  >
                    {value}
                  </span>
                );
              }}
            />
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={METRIC_COLORS.total} stopOpacity={0.3} />
              <stop offset="95%" stopColor={METRIC_COLORS.total} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorReplicated" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={METRIC_COLORS.replicated} stopOpacity={0.3} />
              <stop offset="95%" stopColor={METRIC_COLORS.replicated} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEdge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={METRIC_COLORS.edge} stopOpacity={0.3} />
              <stop offset="95%" stopColor={METRIC_COLORS.edge} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorSignals" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={METRIC_COLORS.signals} stopOpacity={0.3} />
              <stop offset="95%" stopColor={METRIC_COLORS.signals} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorFunctions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={METRIC_COLORS.functions} stopOpacity={0.3} />
              <stop offset="95%" stopColor={METRIC_COLORS.functions} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorMessageActions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={METRIC_COLORS.messageActions} stopOpacity={0.3} />
              <stop offset="95%" stopColor={METRIC_COLORS.messageActions} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorMAU" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={METRIC_COLORS.mau} stopOpacity={0.3} />
              <stop offset="95%" stopColor={METRIC_COLORS.mau} stopOpacity={0} />
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
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            onClick={(e) => {
              const dataKey = e.dataKey as keyof typeof visibleMetrics;
              toggleMetric(dataKey);
            }}
            formatter={(value, entry: any) => {
              const dataKey = entry.dataKey as keyof typeof visibleMetrics;
              const isVisible = visibleMetrics[dataKey];
              return (
                <span 
                  style={{ 
                    color: isVisible ? '#94a3b8' : '#4b5563',
                    cursor: 'pointer',
                    textDecoration: isVisible ? 'none' : 'line-through',
                    opacity: isVisible ? 1 : 0.5,
                  }}
                >
                  {value}
                </span>
              );
            }}
          />
            <Bar dataKey="total" name="Total Transactions" fill={METRIC_COLORS.total} stackId={chartType === 'stacked-bar' ? 'stack' : undefined} hide={!visibleMetrics.total} />
            <Bar dataKey="replicated" name="Replicated" fill={METRIC_COLORS.replicated} stackId={chartType === 'stacked-bar' ? 'stack' : undefined} hide={!visibleMetrics.replicated} />
            <Bar dataKey="edge" name="Edge" fill={METRIC_COLORS.edge} stackId={chartType === 'stacked-bar' ? 'stack' : undefined} hide={!visibleMetrics.edge} />
            <Bar dataKey="signals" name="Signals" fill={METRIC_COLORS.signals} stackId={chartType === 'stacked-bar' ? 'stack' : undefined} hide={!visibleMetrics.signals} />
            <Bar dataKey="functions" name="Functions" fill={METRIC_COLORS.functions} stackId={chartType === 'stacked-bar' ? 'stack' : undefined} hide={!visibleMetrics.functions} />
            <Bar dataKey="messageActions" name="Message Actions" fill={METRIC_COLORS.messageActions} stackId={chartType === 'stacked-bar' ? 'stack' : undefined} hide={!visibleMetrics.messageActions} />
            <Bar dataKey="mau" name="MAU" fill={METRIC_COLORS.mau} stackId={chartType === 'stacked-bar' ? 'stack' : undefined} hide={!visibleMetrics.mau} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        // Line/Area Chart (default)
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={METRIC_COLORS.total} stopOpacity={0.3} />
                <stop offset="95%" stopColor={METRIC_COLORS.total} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReplicated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={METRIC_COLORS.replicated} stopOpacity={0.3} />
                <stop offset="95%" stopColor={METRIC_COLORS.replicated} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorEdge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={METRIC_COLORS.edge} stopOpacity={0.3} />
                <stop offset="95%" stopColor={METRIC_COLORS.edge} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSignals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={METRIC_COLORS.signals} stopOpacity={0.3} />
                <stop offset="95%" stopColor={METRIC_COLORS.signals} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorFunctions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={METRIC_COLORS.functions} stopOpacity={0.3} />
                <stop offset="95%" stopColor={METRIC_COLORS.functions} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMessageActions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={METRIC_COLORS.messageActions} stopOpacity={0.3} />
                <stop offset="95%" stopColor={METRIC_COLORS.messageActions} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMAU" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={METRIC_COLORS.mau} stopOpacity={0.3} />
                <stop offset="95%" stopColor={METRIC_COLORS.mau} stopOpacity={0} />
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
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              onClick={(e) => {
                const dataKey = e.dataKey as keyof typeof visibleMetrics;
                toggleMetric(dataKey);
              }}
              formatter={(value, entry: any) => {
                const dataKey = entry.dataKey as keyof typeof visibleMetrics;
                const isVisible = visibleMetrics[dataKey];
                return (
                  <span 
                    style={{ 
                      color: isVisible ? '#94a3b8' : '#4b5563',
                      cursor: 'pointer',
                      textDecoration: isVisible ? 'none' : 'line-through',
                      opacity: isVisible ? 1 : 0.5,
                    }}
                  >
                    {value}
                  </span>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Total Transactions"
              stroke={METRIC_COLORS.total}
              fillOpacity={1}
              fill="url(#colorTotal)"
              strokeWidth={2}
              hide={!visibleMetrics.total}
            />
            <Area
              type="monotone"
              dataKey="replicated"
              name="Replicated"
              stroke={METRIC_COLORS.replicated}
              fillOpacity={1}
              fill="url(#colorReplicated)"
              strokeWidth={2}
              hide={!visibleMetrics.replicated}
            />
            <Area
              type="monotone"
              dataKey="edge"
              name="Edge"
              stroke={METRIC_COLORS.edge}
              fillOpacity={1}
              fill="url(#colorEdge)"
              strokeWidth={2}
              hide={!visibleMetrics.edge}
            />
            <Area
              type="monotone"
              dataKey="signals"
              name="Signals"
              stroke={METRIC_COLORS.signals}
              fillOpacity={1}
              fill="url(#colorSignals)"
              strokeWidth={2}
              hide={!visibleMetrics.signals}
            />
            <Area
              type="monotone"
              dataKey="functions"
              name="Functions"
              stroke={METRIC_COLORS.functions}
              fillOpacity={1}
              fill="url(#colorFunctions)"
              strokeWidth={2}
              hide={!visibleMetrics.functions}
            />
            <Area
              type="monotone"
              dataKey="messageActions"
              name="Message Actions"
              stroke={METRIC_COLORS.messageActions}
              fillOpacity={1}
              fill="url(#colorMessageActions)"
              strokeWidth={2}
              hide={!visibleMetrics.messageActions}
            />
            <Area
              type="monotone"
              dataKey="mau"
              name="MAU"
              stroke={METRIC_COLORS.mau}
              fillOpacity={1}
              fill="url(#colorMAU)"
              strokeWidth={2}
              hide={!visibleMetrics.mau}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Individual Charts Section */}
      {showIndividualCharts && chartType !== 'pie' && (
        <div className="mt-8 space-y-6">
          {METRICS
            .filter(metric => visibleMetrics[metric.key as keyof typeof visibleMetrics])
            .map(renderIndividualChart)}
        </div>
      )}
    </div>
  );
}
