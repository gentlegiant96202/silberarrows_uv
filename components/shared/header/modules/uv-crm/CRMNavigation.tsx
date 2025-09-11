"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useUserRole } from '@/lib/useUserRole';

export default function CRMNavigation() {
  const routerHook = useRouter();
  const pathname = usePathname();
  const { role, isLoading: roleLoading } = useUserRole();
  
  // Determine active tab directly from pathname to prevent brief highlights
  const getActiveTab = () => {
    if (!pathname) return 'DASHBOARD';
    if (pathname === '/dashboard') return 'DASHBOARD';
    if (pathname === '/crm') return 'CRM';
    if (pathname.startsWith('/customers')) return 'CUSTOMERS';
    if (pathname.startsWith('/inventory')) return 'INVENTORY';
    if (pathname.startsWith('/consignments')) return 'CONSIGNMENTS';
    if (pathname.startsWith('/service')) return 'SERVICE';
    if (pathname.startsWith('/accounting')) return 'ACCOUNTING';
    return 'DASHBOARD'; // Default fallback
  };
  
  const activeTab = getActiveTab();

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
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'SERVICE'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        SERVICE & WARRANTY
      </button>
      
      {/* ACCOUNTING - Shared accounting module */}
      <button
        onClick={() => routerHook.push('/accounting')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'ACCOUNTING'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        ACCOUNTING
      </button>
    </div>
  );
} 