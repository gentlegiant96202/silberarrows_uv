'use client';

import { useState, useCallback } from 'react';
import type { DailySalesMetrics, SalesInputFormData, SalesDataFilter } from '@/types/sales';

export function useSalesData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSalesMetrics = useCallback(async (filter?: SalesDataFilter): Promise<DailySalesMetrics[]> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      
      if (filter?.startDate) params.append('startDate', filter.startDate);
      if (filter?.endDate) params.append('endDate', filter.endDate);
      if (filter?.year) params.append('year', filter.year.toString());
      if (filter?.month) params.append('month', filter.month.toString());

      // Add abort controller to prevent race conditions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`/api/sales-metrics?${params}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch sales metrics');
      }

      return result.data || [];

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sales metrics';
      setError(errorMessage);
      console.error('❌ Error fetching sales metrics:', err);
      
      // Log more details for debugging
      if (err instanceof TypeError && err.message === 'fetch failed') {
        console.error('🔍 Network error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        console.log('🔄 This might be a temporary network issue during development');
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('⏰ Request was aborted (timeout or component unmount)');
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const submitSalesData = useCallback(async (formData: SalesInputFormData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sales-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save sales data');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save sales data';
      setError(errorMessage);
      console.error('Error submitting sales data:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSalesData = useCallback(async (date: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sales-metrics-delete?date=${encodeURIComponent(date)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete sales data');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete sales data';
      setError(errorMessage);
      console.error('Error deleting sales data:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchSalesMetrics,
    submitSalesData,
    deleteSalesData,
  };
} 