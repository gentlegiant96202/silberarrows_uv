"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Monitor, Globe } from 'lucide-react';
import { useAuth } from '@/components/shared/AuthProvider';
import { supabase } from '@/lib/supabaseClient';

export default function WorkshopNavigation({ activeTab, onTabChange }: { activeTab?: string; onTabChange?: (tab: string) => void }) {
  const routerHook = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  
  const [currentTab, setCurrentTab] = useState<'DASHBOARD' | 'SERVICE' | 'XENTRY'>('DASHBOARD');
  const [pendingContractsCount, setPendingContractsCount] = useState(0);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === '/workshop/dashboard') setCurrentTab('DASHBOARD');
    else if (pathname.startsWith('/workshop/service-warranty')) setCurrentTab('SERVICE');
    else if (pathname.startsWith('/workshop/xentry')) setCurrentTab('XENTRY');
    else setCurrentTab('DASHBOARD'); // Default fallback
  }, [pathname]);

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
        const serviceResponse = await fetch('/api/service-contracts?type=service&status=created', { headers });
        const warrantyResponse = await fetch('/api/service-contracts?type=warranty&status=created', { headers });

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
        console.error('Error fetching pending contracts:', error);
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
    <div className="flex gap-1.5 min-w-fit">
      <button
        onClick={() => routerHook.push('/workshop/dashboard')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          currentTab === 'DASHBOARD'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        DASHBOARD
      </button>
      <button
        onClick={() => routerHook.push('/workshop/service-warranty')}
        className={`px-4 py-2 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap flex items-center gap-2 ${
          currentTab === 'SERVICE'
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
      <button
        onClick={() => routerHook.push('/workshop/xentry')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          currentTab === 'XENTRY'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-gradient-to-br hover:from-white/10 hover:to-white/20'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Monitor className="h-4 w-4" />
          <span>XENTRY</span>
          <div className="flex items-center space-x-1">
            <Globe className="h-3 w-3" />
            <span className="text-xs">UK</span>
          </div>
        </div>
      </button>
    </div>
  );
} 