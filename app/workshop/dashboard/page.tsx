"use client";
import { useState, useEffect, useRef } from 'react';
import RouteProtector from '@/components/shared/RouteProtector';
import ServiceDashboard from '@/components/shared/ServiceDashboard';
import { useServiceData } from '@/lib/useServiceData';
import { supabase } from '@/lib/supabaseClient';

export default function WorkshopDashboard() {
  // Service data hooks
  const { 
    loading: serviceLoading, 
    error: serviceError, 
    fetchAllMetrics 
  } = useServiceData();

  // Service data state
  const [allMetrics, setAllMetrics] = useState<any[]>([]);
  const [allTargets, setAllTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetchedInitialData = useRef(false);

  // Fetch service targets
  const fetchAllTargets = async () => {
    try {
      const { data: targets, error } = await supabase
        .from('service_monthly_targets')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) {
        console.error('Error fetching service targets:', error);
        return [];
      }

      return targets || [];
    } catch (error) {
      console.error('Error fetching service targets:', error);
      return [];
    }
  };

  // Load service data
  useEffect(() => {
    if (!hasFetchedInitialData.current) {
      async function loadServiceData() {
        try {
          setLoading(true);
          console.log('🚀 Loading service metrics for workshop dashboard...');
          
          const [metrics, targets] = await Promise.all([
            fetchAllMetrics(),
            fetchAllTargets()
          ]);
          
          setAllMetrics(metrics);
          setAllTargets(targets);
          hasFetchedInitialData.current = true;
          
          console.log('✅ Service metrics loaded for workshop dashboard');
        } catch (error) {
          console.error('❌ Error loading service data for workshop:', error);
          setAllMetrics([]);
          setAllTargets([]);
        } finally {
          setLoading(false);
        }
      }

      loadServiceData();
    }
  }, [fetchAllMetrics]);

  return (
    <RouteProtector moduleName="workshop">
      <main className="h-full overflow-y-auto no-scrollbar relative bg-black">
        <div className="p-4 text-white text-sm">
          {/* Service Dashboard - Always render, let it handle loading state */}
          <div className="mb-6">
            <ServiceDashboard 
              metrics={allMetrics} 
              targets={allTargets}
              loading={loading}
            />
          </div>
        </div>
      </main>
    </RouteProtector>
  );
} 