"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '@/lib/useUserRole';
import { useModulePermissions } from '@/lib/useModulePermissions';

export default function CRMNavigation() {
  const routerHook = useRouter();
  const pathname = usePathname();
  const { role, isLoading: roleLoading } = useUserRole();
  
  // Use proper CRUD permissions for Service & Warranty module
  const { canView: canViewService, isLoading: servicePermissionsLoading } = useModulePermissions('service');
  
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CRM' | 'CUSTOMERS' | 'INVENTORY' | 'CONSIGNMENTS' | 'SERVICE'>('DASHBOARD');

  // Check if user has access to Service & Warranty using proper permissions
  const hasServiceAccess = canViewService && !servicePermissionsLoading;

  useEffect(() => {
    if (!pathname) return;
    if (pathname === '/dashboard') setActiveTab('DASHBOARD');
    else if (pathname === '/crm') setActiveTab('CRM');
    else if (pathname.startsWith('/customers')) setActiveTab('CUSTOMERS');
    else if (pathname.startsWith('/inventory')) setActiveTab('INVENTORY');
    else if (pathname.startsWith('/consignments')) setActiveTab('CONSIGNMENTS');
    else if (pathname.startsWith('/service')) setActiveTab('SERVICE');
    else setActiveTab('DASHBOARD'); // Default fallback
  }, [pathname]);

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => routerHook.push('/dashboard')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'DASHBOARD'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        DASHBOARD
      </button>
      <button
        onClick={() => routerHook.push('/crm')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'CRM'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        CRM
      </button>
      <button
        onClick={() => routerHook.push('/customers')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'CUSTOMERS'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        CUSTOMERS
      </button>
      <button
        onClick={() => routerHook.push('/inventory')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'INVENTORY'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        INVENTORY
      </button>
      <button
        onClick={() => routerHook.push('/consignments')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'CONSIGNMENTS'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        CONSIGNMENTS
      </button>
      
      {/* SERVICE & WARRANTY - Now uses proper CRUD permissions */}
      {!roleLoading && !servicePermissionsLoading && hasServiceAccess && (
        <button
          onClick={() => routerHook.push('/service')}
          className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
            activeTab === 'SERVICE'
              ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
              : 'text-white/70 hover:text-white hover:bg-black/60'
          }`}
        >
          SERVICE & WARRANTY
        </button>
      )}
    </div>
  );
} 