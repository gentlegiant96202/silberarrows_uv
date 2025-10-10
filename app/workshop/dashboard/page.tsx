"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useModulePermissions } from '@/lib/useModulePermissions';
import PulsatingLogo from '@/components/shared/PulsatingLogo';
import { Shield, Wrench, LayoutDashboard } from 'lucide-react';
import RouteProtector from '@/components/shared/RouteProtector';
import ServiceDashboard from '@/components/shared/ServiceDashboard';
import { useServiceData } from '@/lib/useServiceData';
import { supabase } from '@/lib/supabaseClient';

export default function WorkshopDashboard() {
  const router = useRouter();
  const { canView, isLoading: permissionLoading, error } = useModulePermissions('workshop');

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
    if (!permissionLoading && canView && !hasFetchedInitialData.current) {
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
  }, [permissionLoading, canView, fetchAllMetrics]);

  // Redirect if no permission
  useEffect(() => {
    if (!permissionLoading && !canView) {
      router.push('/');
    }
  }, [canView, permissionLoading, router]);

  // Show loading while checking permissions
  if (permissionLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <PulsatingLogo size={48} text="Checking access permissions..." />
      </div>
    );
  }

  // Show access denied if no permission
  if (!canView) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold mb-2 text-white">Access Denied</h1>
          <p className="text-white/70 mb-6">
            You don't have permission to access the workshop module.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <RouteProtector moduleName="workshop">
      <main className="h-full overflow-y-auto no-scrollbar relative bg-black">
        <div className="p-4 text-white text-sm">
          {/* Service Dashboard */}
          <div className="mb-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <PulsatingLogo size={48} text="Loading service metrics..." />
              </div>
            ) : (
              <div className="animate-fadeIn">
                <ServiceDashboard 
                  metrics={allMetrics} 
                  targets={allTargets}
                  loading={serviceLoading}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </RouteProtector>
  );
} 