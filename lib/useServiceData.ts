import { useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { 
  DailyServiceMetrics, 
  ServiceMonthlyTarget, 
  ServiceInputFormData, 
  ServiceDashboardData,
  ServiceDataFilter 
} from '@/types/service';

interface UseServiceDataReturn {
  // Data state
  data: ServiceDashboardData | null;
  loading: boolean;
  error: string | null;
  submitting: boolean;
  
  // Core functions
  fetchServiceData: (date: string) => Promise<void>;
  submitInputData: (formData: ServiceInputFormData) => Promise<boolean>;
  deleteMetricsForDate: (date: string) => Promise<boolean>;
  refetch: () => Promise<void>;
  
  // Additional fetch functions
  fetchAllMetrics: () => Promise<DailyServiceMetrics[]>;
  fetchMetricsRange: (startDate: string, endDate: string) => Promise<DailyServiceMetrics[]>;
}

export function useServiceData(initialDate?: string): UseServiceDataReturn {
  const [data, setData] = useState<ServiceDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState(initialDate || new Date().toISOString().split('T')[0]);

  // Fetch monthly targets for a given date
  const fetchTargets = useCallback(async (date: string): Promise<ServiceMonthlyTarget | null> => {
    const targetDate = new Date(date);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    const { data: targets, error } = await supabase
      .from('service_monthly_targets')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single();

    if (error && error.code !== 'PGRST116') { 
      return null;
    }

    return targets;
  }, []);

  // Fetch daily metrics for a specific date
  const fetchMetricsForDate = useCallback(async (date: string): Promise<DailyServiceMetrics | null> => {
    const { data: metrics, error } = await supabase
      .from('daily_service_metrics')
      .select('*')
      .eq('metric_date', date)
      .single();

    if (error && error.code !== 'PGRST116') { 
      return null;
    }

    return metrics;
  }, []);

  // Transform daily metrics to dashboard data structure
  const transformMetricsToData = useCallback((
    metrics: DailyServiceMetrics | null, 
    targets: ServiceMonthlyTarget | null,
    date: string
  ): ServiceDashboardData => {
    return {
      inputs: {
        working_days_elapsed: metrics?.working_days_elapsed || 0,
        current_net_sales: metrics?.current_net_sales || 0,
        current_net_labor_sales: metrics?.current_net_labor_sales || 0,
        number_of_invoices: metrics?.number_of_invoices || 0,
        current_marketing_spend: metrics?.current_marketing_spend || 0,
        
        // Individual salesperson data
        daniel_total_sales: metrics?.daniel_total_sales || 0,
        essrar_total_sales: metrics?.essrar_total_sales || 0,
        lucy_total_sales: metrics?.lucy_total_sales || 0
      },
      calculated: {
        current_net_sales_percentage: metrics?.current_net_sales_percentage || 0,
        current_labour_sales_percentage: metrics?.current_labour_sales_percentage || 0,
        remaining_net_sales: metrics?.remaining_net_sales || 0,
        remaining_labour_sales: metrics?.remaining_labour_sales || 0,
        current_daily_average: metrics?.current_daily_average || 0,
        estimated_net_sales: metrics?.estimated_net_sales || 0,
        estimated_net_sales_percentage: metrics?.estimated_net_sales_percentage || 0,
        estimated_labor_sales: metrics?.estimated_labor_sales || 0,
        estimated_labor_sales_percentage: metrics?.estimated_labor_sales_percentage || 0,
        daily_average_needed: metrics?.daily_average_needed || 0
      },
      targets: targets ? {
        net_sales_target: targets.net_sales_target,
        labour_sales_target: targets.labour_sales_target,
        number_of_working_days: targets.number_of_working_days,
        net_sales_112_percent: targets.net_sales_112_percent || (targets.net_sales_target * 1.12),
        daily_cumulative_target: targets.daily_cumulative_target || (targets.net_sales_target / targets.number_of_working_days)
      } : undefined
    };
  }, []);

  // Main fetch function for dashboard data
  const fetchServiceData = useCallback(async (date: string) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentDate(date);

      const [metrics, targets] = await Promise.all([
        fetchMetricsForDate(date),
        fetchTargets(date)
      ]);

      const dashboardData = transformMetricsToData(metrics, targets, date);
      setData(dashboardData);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch service data');
    } finally {
      setLoading(false);
    }
  }, [fetchMetricsForDate, fetchTargets, transformMetricsToData]);

  // Submit input data (create/update)
  const submitInputData = useCallback(async (formData: ServiceInputFormData): Promise<boolean> => {
    try {
      setSubmitting(true);
      setError(null);
      const response = await fetch('/api/service-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save data');
      }

      const result = await response.json();
      // Refresh data after successful save
      await fetchServiceData(formData.date);
      
      return true;

    } catch (err: any) {
      setError(err.message || 'Failed to save data');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [fetchServiceData]);

  // Delete all metrics for a specific date
  const deleteMetricsForDate = useCallback(async (date: string): Promise<boolean> => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/service-metrics-delete?date=${encodeURIComponent(date)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete metrics');
      }

      const result = await response.json();
      // Refresh data after deletion
      await fetchServiceData(currentDate);
      
      return true;

    } catch (err: any) {
      setError(err.message || 'Failed to delete metrics');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [currentDate, fetchServiceData]);

  // Fetch all metrics (for data grid)
  const fetchAllMetrics = useCallback(async (): Promise<DailyServiceMetrics[]> => {
    try {
      const { data: metrics, error } = await supabase
        .from('daily_service_metrics')
        .select('*')
        .order('metric_date', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return metrics || [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Fetch metrics for a date range
  const fetchMetricsRange = useCallback(async (startDate: string, endDate: string): Promise<DailyServiceMetrics[]> => {
    try {
      const { data: metrics, error } = await supabase
        .from('daily_service_metrics')
        .select('*')
        .gte('metric_date', startDate)
        .lte('metric_date', endDate)
        .order('metric_date', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return metrics || [];
    } catch (err: any) {
      throw err;
    }
  }, []);

  // Refetch current data
  const refetch = useCallback(async () => {
    if (currentDate) {
      await fetchServiceData(currentDate);
    }
  }, [currentDate, fetchServiceData]);

  return {
    data,
    loading,
    error,
    submitting,
    fetchServiceData,
    submitInputData,
    deleteMetricsForDate,
    refetch,
    fetchAllMetrics,
    fetchMetricsRange
  };
} 