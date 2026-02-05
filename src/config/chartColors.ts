/**
 * Centralized chart color configuration
 * Defines a consistent 7-color palette for all chart visualizations
 */

export const METRIC_COLORS = {
  total: '#E41A1C',        // Red
  replicated: '#377EB8',   // Blue
  edge: '#4DAF4A',         // Green
  signals: '#7B68EE',      // Slate Blue
  functions: '#FF7F00',    // Orange
  messageActions: '#00CED1', // Turquoise
  mau: '#8B4513',          // Brown
} as const;

// For charts that cycle through colors (ApiBreakdownChart)
export const CHART_COLORS = Object.values(METRIC_COLORS);

// Type for metric keys
export type MetricKey = keyof typeof METRIC_COLORS;
