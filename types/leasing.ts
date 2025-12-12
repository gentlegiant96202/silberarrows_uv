// Leasing Department Types - Unified Table Approach
// Following the same pattern as sales.ts

export interface LeasingMonthlyTarget {
  id?: string;
  year: number;
  month: number;
  a_class_sales_target: number;
  others_sales_target: number;
  total_target: number;
  total_target_112_percent: number;
  number_of_working_days: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// Unified daily metrics - combines inputs and calculated values
export interface DailyLeasingMetrics {
  id?: string;
  metric_date: string;
  year: number;
  month: number;
  working_days_elapsed: number;
  
  // Manual Input Fields
  current_a_class_sales: number;
  current_others_sales: number;
  number_of_invoices: number;
  excess_mileage: number;
  traffic_fines: number;
  salik: number;
  current_marketing_spend: number;
  
  // Auto-Calculated Fields (computed by database)
  total_net_sales: number;
  current_net_sales_percentage: number;
  remaining_a_class_sales: number;
  remaining_others_sales: number;
  a_class_net_sales_percentage: number;
  others_net_sales_percentage: number;
  total_daily_average: number;
  estimated_net_sales: number;
  estimated_net_sales_percentage: number;
  daily_cumulative_target: number;
  
  notes?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

// Form data for input (only the fields user can edit)
export interface LeasingInputFormData {
  date: string;
  working_days_elapsed: number;
  current_a_class_sales: number;
  current_others_sales: number;
  number_of_invoices: number;
  excess_mileage: number;
  traffic_fines: number;
  salik: number;
  current_marketing_spend: number;
  notes?: string;
}

// Dashboard data structure
export interface LeasingDashboardData {
  metrics: DailyLeasingMetrics[];
  targets: LeasingMonthlyTarget[];
  summary?: {
    totalEntries: number;
    latestEntry?: DailyLeasingMetrics;
    currentMonthTarget?: LeasingMonthlyTarget;
  };
}

// Filter options
export interface LeasingDataFilter {
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
}

// Chart data structure
export interface LeasingChartData {
  date: string;
  [key: string]: any;
}

// API response types
export interface LeasingMetricsResponse {
  data: DailyLeasingMetrics[];
  count: number;
  error?: string;
}

export interface LeasingDashboardResponse {
  metrics: DailyLeasingMetrics[];
  targets: LeasingMonthlyTarget[];
  error?: string;
}

// Form validation
export interface LeasingFormErrors {
  [key: string]: string;
}

// Metric definitions for the UI
export const INPUT_METRICS = [
  'working_days_elapsed',
  'current_a_class_sales',
  'current_others_sales',
  'number_of_invoices',
  'excess_mileage',
  'traffic_fines',
  'salik',
  'current_marketing_spend'
] as const;

export const CALCULATED_METRICS = [
  'total_net_sales',
  'current_net_sales_percentage',
  'remaining_a_class_sales',
  'remaining_others_sales',
  'a_class_net_sales_percentage',
  'others_net_sales_percentage',
  'total_daily_average',
  'estimated_net_sales',
  'estimated_net_sales_percentage',
  'daily_cumulative_target'
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
  current_a_class_sales: {
    key: 'current_a_class_sales',
    label: 'A CLASS Sales',
    type: 'currency',
    editable: true,
    description: 'Current cumulative A CLASS sales for the month'
  },
  current_others_sales: {
    key: 'current_others_sales',
    label: 'OTHERS Sales',
    type: 'currency',
    editable: true,
    description: 'Current cumulative OTHERS sales for the month'
  },
  number_of_invoices: {
    key: 'number_of_invoices',
    label: 'Invoices',
    type: 'integer',
    editable: true,
    description: 'Number of invoices processed'
  },
  excess_mileage: {
    key: 'excess_mileage',
    label: 'Excess Mileage',
    type: 'currency',
    editable: true,
    description: 'Revenue from excess mileage charges'
  },
  traffic_fines: {
    key: 'traffic_fines',
    label: 'Traffic Fines',
    type: 'currency',
    editable: true,
    description: 'Revenue from traffic fine recharges'
  },
  salik: {
    key: 'salik',
    label: 'Salik',
    type: 'currency',
    editable: true,
    description: 'Revenue from Salik toll recharges'
  },
  current_marketing_spend: {
    key: 'current_marketing_spend',
    label: 'Marketing Spend',
    type: 'currency',
    editable: true,
    description: 'Current cumulative marketing spend for the month'
  },
  total_net_sales: {
    key: 'total_net_sales',
    label: 'Total Net Sales',
    type: 'currency',
    editable: false,
    description: 'Calculated: A CLASS Sales + OTHERS Sales'
  },
  current_net_sales_percentage: {
    key: 'current_net_sales_percentage',
    label: 'Net Sales %',
    type: 'percentage',
    editable: false,
    description: 'Calculated: (Total Net Sales / Total Target) × 100'
  },
  remaining_a_class_sales: {
    key: 'remaining_a_class_sales',
    label: 'Remaining A CLASS',
    type: 'currency',
    editable: false,
    description: 'Calculated: A CLASS Target - Current A CLASS Sales'
  },
  remaining_others_sales: {
    key: 'remaining_others_sales',
    label: 'Remaining OTHERS',
    type: 'currency',
    editable: false,
    description: 'Calculated: OTHERS Target - Current OTHERS Sales'
  },
  a_class_net_sales_percentage: {
    key: 'a_class_net_sales_percentage',
    label: 'A CLASS %',
    type: 'percentage',
    editable: false,
    description: 'Calculated: (A CLASS Sales / A CLASS Target) × 100'
  },
  others_net_sales_percentage: {
    key: 'others_net_sales_percentage',
    label: 'OTHERS %',
    type: 'percentage',
    editable: false,
    description: 'Calculated: (OTHERS Sales / OTHERS Target) × 100'
  },
  total_daily_average: {
    key: 'total_daily_average',
    label: 'Daily Average',
    type: 'currency',
    editable: false,
    description: 'Calculated: Total Net Sales / Working Days Elapsed'
  },
  estimated_net_sales: {
    key: 'estimated_net_sales',
    label: 'Estimated Sales',
    type: 'currency',
    editable: false,
    description: 'Calculated: Daily Average × Number of Working Days'
  },
  estimated_net_sales_percentage: {
    key: 'estimated_net_sales_percentage',
    label: 'Estimated %',
    type: 'percentage',
    editable: false,
    description: 'Calculated: (Estimated Net Sales / Total Target) × 100'
  },
  daily_cumulative_target: {
    key: 'daily_cumulative_target',
    label: 'Daily Target Pace',
    type: 'currency',
    editable: false,
    description: 'Calculated: Target pace based on working days elapsed'
  }
};

// Utility functions
export const formatLeasingValue = (value: number | null | undefined, type: string): string => {
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

