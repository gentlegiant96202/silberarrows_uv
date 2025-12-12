'use client';

import { useState, useCallback } from 'react';
import type { DailyLeasingMetrics, LeasingInputFormData, LeasingDataFilter } from '@/types/leasing';

export function useLeasingData() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeasingMetrics = useCallback(async (filter?: LeasingDataFilter): Promise<DailyLeasingMetrics[]> => {
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

      const response = await fetch(`/api/leasing-metrics?${params}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch leasing metrics');
      }

      return result.data || [];

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leasing metrics';
      setError(errorMessage);
      
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const submitLeasingData = useCallback(async (formData: LeasingInputFormData): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leasing-metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save leasing data');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save leasing data';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteLeasingData = useCallback(async (date: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/leasing-metrics-delete?date=${encodeURIComponent(date)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete leasing data');
      }

      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete leasing data';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    fetchLeasingMetrics,
    submitLeasingData,
    deleteLeasingData,
  };
}

