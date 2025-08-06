// Sales Department Types - Unified Table Approach

export interface SalesMonthlyTarget {
  id?: string;
  year: number;
  month: number;
  gross_profit_year_target: number;
  gross_profit_month_target: number;
  number_of_working_days: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// Unified daily metrics - combines inputs and calculated values
export interface DailySalesMetrics {
  id?: string;
  metric_date: string;
  year: number;
  month: number;
  working_days_elapsed: number;
  
  // Manual Input Fields
  gross_sales_year_actual: number;
  cost_of_sales_year_actual: number;
  gross_sales_month_actual: number;
  cost_of_sales_month_actual: number;
  marketing_spend_month: number;
  units_disposed_month: number;
  units_sold_stock_month: number;
  units_sold_consignment_month: number;
  
  // Auto-Calculated Fields (computed by database)
  gross_profit_year_actual: number;
  gross_profit_month_actual: number;
  total_units_sold_month: number;
  
  // Target-based calculations (computed via trigger)
  gross_profit_year_target?: number;
  gross_profit_month_target?: number;
  total_working_days?: number;
  gross_profit_year_achieved_percentage?: number;
  gross_profit_month_achieved_percentage?: number;
  average_gross_profit_per_car_month?: number;
  marketing_rate_against_gross_profit?: number;
  
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// Form data for input (only the fields user can edit)
export interface SalesInputFormData {
  date: string;
  working_days_elapsed: number;
  gross_sales_year_actual: number;
  cost_of_sales_year_actual: number;
  gross_sales_month_actual: number;
  cost_of_sales_month_actual: number;
  marketing_spend_month: number;
  units_disposed_month: number;
  units_sold_stock_month: number;
  units_sold_consignment_month: number;
  notes?: string;
}

// Dashboard data structure
export interface SalesDashboardData {
  metrics: DailySalesMetrics[];
  targets: SalesMonthlyTarget[];
  summary?: {
    totalEntries: number;
    latestEntry?: DailySalesMetrics;
    currentMonthTarget?: SalesMonthlyTarget;
  };
}

// Filter options
export interface SalesDataFilter {
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
}

// Chart data structure
export interface SalesChartData {
  date: string;
  [key: string]: any;
}

// API response types
export interface SalesMetricsResponse {
  data: DailySalesMetrics[];
  count: number;
  error?: string;
}

export interface SalesDashboardResponse {
  metrics: DailySalesMetrics[];
  targets: SalesMonthlyTarget[];
  error?: string;
}

// Form validation
export interface SalesFormErrors {
  [key: string]: string;
}

// Metric definitions for the UI
export const INPUT_METRICS = [
  'working_days_elapsed',
  'gross_sales_year_actual',
  'cost_of_sales_year_actual', 
  'gross_sales_month_actual',
  'cost_of_sales_month_actual',
  'marketing_spend_month',
  'units_disposed_month',
  'units_sold_stock_month',
  'units_sold_consignment_month'
] as const;

export const CALCULATED_METRICS = [
  'gross_profit_year_actual',
  'gross_profit_year_achieved_percentage',
  'gross_profit_month_actual', 
  'gross_profit_month_achieved_percentage',
  'total_units_sold_month',
  'average_gross_profit_per_car_month',
  'marketing_rate_against_gross_profit'
] as const;

export const ALL_METRICS = [...INPUT_METRICS, ...CALCULATED_METRICS] as const;

export type MetricName = typeof ALL_METRICS[number];
export type InputMetricName = typeof INPUT_METRICS[number];
export type CalculatedMetricName = typeof CALCULATED_METRICS[number];

// Metric definitions for display
export interface MetricDefinition {
  key: string;
  label: string;
  type: 'currency' | 'percentage' | 'number' | 'integer';
  editable: boolean;
  description: string;
}

export const METRIC_DEFINITIONS: Record<MetricName, MetricDefinition> = {
  working_days_elapsed: {
    key: 'working_days_elapsed',
    label: 'Working Days',
    type: 'integer',
    editable: true,
    description: 'Number of working days that have passed this month'
  },
  gross_sales_year_actual: {
    key: 'gross_sales_year_actual',
    label: 'Gross Sales (Year)',
    type: 'currency',
    editable: true,
    description: 'Cumulative gross sales for the year'
  },
  cost_of_sales_year_actual: {
    key: 'cost_of_sales_year_actual',
    label: 'Cost of Sales (Year)',
    type: 'currency',
    editable: true,
    description: 'Cumulative cost of sales for the year'
  },
  gross_sales_month_actual: {
    key: 'gross_sales_month_actual',
    label: 'Gross Sales (Month)',
    type: 'currency',
    editable: true,
    description: 'Cumulative gross sales for the month'
  },
  cost_of_sales_month_actual: {
    key: 'cost_of_sales_month_actual',
    label: 'Cost of Sales (Month)',
    type: 'currency',
    editable: true,
    description: 'Cumulative cost of sales for the month'
  },
  marketing_spend_month: {
    key: 'marketing_spend_month',
    label: 'Marketing Spend',
    type: 'currency',
    editable: true,
    description: 'Total marketing spend for the month'
  },
  units_disposed_month: {
    key: 'units_disposed_month',
    label: 'Units Disposed',
    type: 'integer',
    editable: true,
    description: 'Total units disposed cars for the month'
  },
  units_sold_stock_month: {
    key: 'units_sold_stock_month',
    label: 'Stock Units Sold',
    type: 'integer',
    editable: true,
    description: 'Total units sold from stock inventory for the month'
  },
  units_sold_consignment_month: {
    key: 'units_sold_consignment_month',
    label: 'Consignment Units Sold',
    type: 'integer',
    editable: true,
    description: 'Total units sold from consignment for the month'
  },
  gross_profit_year_actual: {
    key: 'gross_profit_year_actual',
    label: 'Gross Profit (Year)',
    type: 'currency',
    editable: false,
    description: 'Calculated: Gross Sales Year - Cost of Sales Year'
  },
  gross_profit_year_achieved_percentage: {
    key: 'gross_profit_year_achieved_percentage',
    label: 'Year Achievement %',
    type: 'percentage',
    editable: false,
    description: 'Calculated: (Gross Profit Year Actual / Target) × 100'
  },
  gross_profit_month_actual: {
    key: 'gross_profit_month_actual',
    label: 'Gross Profit (Month)',
    type: 'currency',
    editable: false,
    description: 'Calculated: Gross Sales Month - Cost of Sales Month'
  },
  gross_profit_month_achieved_percentage: {
    key: 'gross_profit_month_achieved_percentage',
    label: 'Month Achievement %',
    type: 'percentage',
    editable: false,
    description: 'Calculated: (Gross Profit Month Actual / Target) × 100'
  },
  total_units_sold_month: {
    key: 'total_units_sold_month',
    label: 'Total Units Sold',
    type: 'integer',
    editable: false,
    description: 'Calculated: Units Sold Stock + Units Sold Consignment'
  },
  average_gross_profit_per_car_month: {
    key: 'average_gross_profit_per_car_month',
    label: 'Avg Profit Per Car',
    type: 'currency',
    editable: false,
    description: 'Calculated: Gross Profit Month / Total Units Sold Month'
  },
  marketing_rate_against_gross_profit: {
    key: 'marketing_rate_against_gross_profit',
    label: 'Marketing Rate %',
    type: 'percentage',
    editable: false,
    description: 'Calculated: (Marketing Spend / Gross Profit Month) × 100'
  }
};

// Utility functions
export const formatSalesValue = (value: number | null | undefined, type: string): string => {
  if (value === null || value === undefined || isNaN(value)) return '-';

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    
    case 'percentage':
      return `${value.toFixed(1)}%`;
    
    case 'integer':
      return Math.round(value).toLocaleString();
    
    case 'number':
    default:
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
  }
};

export const getMetricDefinition = (key: string): MetricDefinition | undefined => {
  return METRIC_DEFINITIONS[key as MetricName];
}; 