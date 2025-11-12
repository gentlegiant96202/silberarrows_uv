"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '@/lib/useUserRole';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export default function CRMNavigation() {
  const routerHook = useRouter();
  const pathname = usePathname();
  const { role, isLoading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const [pendingContractsCount, setPendingContractsCount] = useState(0);
  
  // Determine active tab directly from pathname to prevent brief highlights
  const getActiveTab = () => {
    if (!pathname) return 'DASHBOARD';
    if (pathname === '/dashboard') return 'DASHBOARD';
    if (pathname === '/crm') return 'CRM';
    if (pathname.startsWith('/customers')) return 'CUSTOMERS';
    if (pathname.startsWith('/inventory')) return 'INVENTORY';
    if (pathname.startsWith('/consignments')) return 'CONSIGNMENTS';
    if (pathname.startsWith('/service')) return 'SERVICE';
    if (pathname.startsWith('/accounting')) return 'ACCOUNTS';
    return 'DASHBOARD'; // Default fallback
  };
  
  const activeTab = getActiveTab();

  // Fetch initial pending contracts count and set up realtime subscription
  useEffect(() => {
    if (!user) return;

    const fetchPendingContracts = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        
        if (!token) return;

        const headers = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        // Fetch service contracts with 'created' status
        const serviceResponse = await fetch('/api/service-contracts?type=service&status=created', { headers, credentials: 'include' });
        const warrantyResponse = await fetch('/api/service-contracts?type=warranty&status=created', { headers, credentials: 'include' });

        let count = 0;
        
        if (serviceResponse.ok) {
          const serviceData = await serviceResponse.json();
          count += (serviceData.contracts || []).filter((c: any) => c.workflow_status === 'created').length;
        }
        
        if (warrantyResponse.ok) {
          const warrantyData = await warrantyResponse.json();
          count += (warrantyData.contracts || []).filter((c: any) => c.workflow_status === 'created').length;
        }

        setPendingContractsCount(count);
      } catch (error) {
      }
    };

    // Initial fetch
    fetchPendingContracts();

    // Polling every 3 seconds for reliable updates
    const interval = setInterval(fetchPendingContracts, 3000);

    // Cleanup interval
    return () => {
      clearInterval(interval);
    };
  }, [user]);

  return (
    <div className="flex gap-1 min-w-fit">
      <button
        onClick={() => routerHook.push('/dashboard')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'DASHBOARD'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        DASHBOARD
      </button>
      <button
        onClick={() => routerHook.push('/crm')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'CRM'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        CRM
      </button>
      <button
        onClick={() => routerHook.push('/customers')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'CUSTOMERS'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        CUSTOMERS
      </button>
      <button
        onClick={() => routerHook.push('/inventory')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'INVENTORY'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        INVENTORY
      </button>
      <button
        onClick={() => routerHook.push('/consignments')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'CONSIGNMENTS'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        CONSIGNMENTS
      </button>
      
      {/* SERVICE & WARRANTY - Permission checking handled at page level */}
      <button
        onClick={() => routerHook.push('/service')}
        className={`px-4 py-2 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap flex items-center gap-2 ${
          activeTab === 'SERVICE'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        <span>SERVICE & WARRANTY</span>
        {pendingContractsCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
            {pendingContractsCount}
          </span>
        )}
      </button>
      
      {/* ACCOUNTS - Shared accounting module */}
      <button
        onClick={() => routerHook.push('/accounting')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'ACCOUNTS'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        ACCOUNTS
      </button>
      
    </div>
  );
} 