// Simplified Service Department Performance Tracking Types
// Updated to match single-row-per-date schema

// ServiceMonthlyTarget interface
export interface ServiceMonthlyTarget {
  id?: string;
  year: number;
  month: number;
  net_sales_target: number;
  net_sales_112_percent: number;
  daily_cumulative_target: number;
  labour_sales_target: number;
  number_of_working_days: number;
  created_at?: string;
  updated_at?: string;
}

// DailyServiceMetrics interface - represents a single row in daily_service_metrics table
export interface DailyServiceMetrics {
  metric_date: string;
  
  // Input metrics (editable by user)
  working_days_elapsed: number;
  current_net_sales: number;
  current_net_labor_sales: number;
  number_of_invoices: number;
  current_marketing_spend: number;
  
  // Individual salesperson metrics (editable by user) - cumulative monthly sales
  daniel_total_sales: number;
  essrar_total_sales: number;
  lucy_total_sales: number;
  
  // Calculated metrics (computed by database)
  current_net_sales_percentage: number;
  current_labour_sales_percentage: number;
  remaining_net_sales: number;
  remaining_labour_sales: number;
  current_daily_average: number;
  estimated_net_sales: number;
  estimated_net_sales_percentage: number;
  estimated_labor_sales: number;
  estimated_labor_sales_percentage: number;
  daily_average_needed: number;
  
  // Optional fields
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

// For form inputs
export interface ServiceInputFormData {
  date: string;
  working_days_elapsed: number;
  current_net_sales: number;
  current_net_labor_sales: number;
  number_of_invoices: number;
  current_marketing_spend: number;
  
  // Individual salesperson data
  daniel_total_sales: number;
  essrar_total_sales: number;
  lucy_total_sales: number;
  
  notes?: string;
}

// For dashboard display
export interface ServiceDashboardData {
  inputs: {
    working_days_elapsed: number;
    current_net_sales: number;
    current_net_labor_sales: number;
    number_of_invoices: number;
    current_marketing_spend: number;
    
    // Individual salesperson data
    daniel_total_sales: number;
    essrar_total_sales: number;
    lucy_total_sales: number;
  };
  
  calculated: {
    current_net_sales_percentage: number;
    current_labour_sales_percentage: number;
    remaining_net_sales: number;
    remaining_labour_sales: number;
    current_daily_average: number;
    estimated_net_sales: number;
    estimated_net_sales_percentage: number;
    estimated_labor_sales: number;
    estimated_labor_sales_percentage: number;
    daily_average_needed: number;
  };
  
  targets?: {
    net_sales_target: number;
    net_sales_112_percent: number;
    daily_cumulative_target: number;
    labour_sales_target: number;
    number_of_working_days: number;
  };
}

// Other interfaces remain the same...
export interface ServiceDataFilter {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}

export interface ServiceChartData {
  date: string;
  currentSales: number;
  estimatedSales: number;
  targetSales: number;
  workingDays: number;
}

export interface ServiceMetricsResponse {
  success: boolean;
  data: DailyServiceMetrics[];
  error?: string;
}

export interface ServiceDashboardResponse {
  success: boolean;
  data: ServiceDashboardData;
  error?: string;
}

export interface ServiceFormErrors {
  [key: string]: string;
}

// Constants for metric organization
export const INPUT_METRICS = [
  'working_days_elapsed',
  'current_net_sales', 
  'current_net_labor_sales',
  'number_of_invoices',
  'current_marketing_spend'
] as const;

export const INDIVIDUAL_METRICS = [
  'daniel_total_sales',
  'essrar_total_sales', 
  'lucy_total_sales'
] as const;

export const CALCULATED_METRICS = [
  'current_net_sales_percentage',
  'current_labour_sales_percentage', 
  'remaining_net_sales',
  'remaining_labour_sales',
  'current_daily_average',
  'estimated_net_sales',
  'estimated_net_sales_percentage',
  'estimated_labor_sales',
  'estimated_labor_sales_percentage',
  'daily_average_needed'
] as const;

export const ALL_METRICS = [...INPUT_METRICS, ...INDIVIDUAL_METRICS, ...CALCULATED_METRICS] as const;

export type MetricName = typeof ALL_METRICS[number];
export type InputMetricName = typeof INPUT_METRICS[number];
export type IndividualMetricName = typeof INDIVIDUAL_METRICS[number];
export type CalculatedMetricName = typeof CALCULATED_METRICS[number];

// Metric definitions for display and validation
export interface MetricDefinition {
  name: string;
  type: 'currency' | 'percentage' | 'count' | 'days';
  unit?: string;
  description: string;
  category: 'input' | 'individual' | 'calculated' | 'target';
  isEditable: boolean;
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  // Input metrics
  working_days_elapsed: {
    name: 'Working Days',
    type: 'days',
    unit: 'days',
    description: 'Number of working days elapsed in the month',
    category: 'input',
    isEditable: true
  },
  current_net_sales: {
    name: 'Net Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Current cumulative net sales for the month',
    category: 'input',
    isEditable: true
  },
  current_net_labor_sales: {
    name: 'Labor Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Current cumulative labor sales for the month',
    category: 'input',
    isEditable: true
  },
  number_of_invoices: {
    name: 'Invoices',
    type: 'count',
    unit: 'invoices',
    description: 'Number of invoices processed today',
    category: 'input',
    isEditable: true
  },
  current_marketing_spend: {
    name: 'Marketing Spend',
    type: 'currency',
    unit: 'AED',
    description: 'Current cumulative marketing spend for the month',
    category: 'input',
    isEditable: true
  },
  
  // Individual salesperson metrics
  daniel_total_sales: {
    name: 'Daniel Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Daniel\'s cumulative total sales for the month',
    category: 'individual',
    isEditable: true
  },
  essrar_total_sales: {
    name: 'Essrar Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Essrar\'s cumulative total sales for the month',
    category: 'individual',
    isEditable: true
  },
  lucy_total_sales: {
    name: 'Lucy Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Lucy\'s cumulative total sales for the month',
    category: 'individual',
    isEditable: true
  },
  
  // Calculated metrics
  current_net_sales_percentage: {
    name: 'Net Sales %',
    type: 'percentage',
    unit: '%',
    description: 'Current net sales as percentage of target',
    category: 'calculated',
    isEditable: false
  },
  current_labour_sales_percentage: {
    name: 'Labor Sales %',
    type: 'percentage',
    unit: '%',
    description: 'Current labor sales as percentage of target',
    category: 'calculated',
    isEditable: false
  },
  remaining_net_sales: {
    name: 'Remaining Net Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Remaining net sales needed to reach target',
    category: 'calculated',
    isEditable: false
  },
  remaining_labour_sales: {
    name: 'Remaining Labor Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Remaining labor sales needed to reach target',
    category: 'calculated',
    isEditable: false
  },
  current_daily_average: {
    name: 'Daily Average',
    type: 'currency',
    unit: 'AED/day',
    description: 'Current daily average net sales',
    category: 'calculated',
    isEditable: false
  },
  estimated_net_sales: {
    name: 'Estimated Net Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Estimated net sales for the full month',
    category: 'calculated',
    isEditable: false
  },
  estimated_net_sales_percentage: {
    name: 'Estimated Net Sales %',
    type: 'percentage',
    unit: '%',
    description: 'Estimated net sales as percentage of target',
    category: 'calculated',
    isEditable: false
  },
  estimated_labor_sales: {
    name: 'Estimated Labor Sales',
    type: 'currency',
    unit: 'AED',
    description: 'Estimated labor sales for the full month',
    category: 'calculated',
    isEditable: false
  },
  estimated_labor_sales_percentage: {
    name: 'Estimated Labor Sales %',
    type: 'percentage',
    unit: '%',
    description: 'Estimated labor sales as percentage of target',
    category: 'calculated',
    isEditable: false
  },
  daily_average_needed: {
    name: 'Daily Average Needed',
    type: 'currency',
    unit: 'AED/day',
    description: 'Daily average needed to reach target',
    category: 'calculated',
    isEditable: false
  },
  
  // Target metrics (for display in grid)
  net_sales_target: {
    name: 'Net Sales Target',
    type: 'currency',
    unit: 'AED',
    description: 'Monthly net sales target',
    category: 'target',
    isEditable: false
  },
  labour_sales_target: {
    name: 'Labor Sales Target',
    type: 'currency',
    unit: 'AED',
    description: 'Monthly labor sales target',
    category: 'target',
    isEditable: false
  },
  number_of_working_days: {
    name: 'Working Days',
    type: 'days',
    unit: 'days',
    description: 'Total working days in the month',
    category: 'target',
    isEditable: false
  }
};

// Utility functions
export const formatServiceValue = (value: number | string | null | undefined, type: MetricDefinition['type']): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '-';
  }
  
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue);
    
    case 'percentage':
      return `${numValue.toFixed(1)}%`;
    
    case 'count':
      return Math.round(numValue).toLocaleString();
    
    case 'days':
      return `${Math.round(numValue)} days`;
    
    default:
      return numValue.toLocaleString();
  }
};

export const getMetricDefinition = (metricName: string): MetricDefinition | undefined => {
  return METRIC_DEFINITIONS[metricName];
}; 