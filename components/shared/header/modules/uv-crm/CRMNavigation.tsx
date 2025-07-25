"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function CRMNavigation() {
  const routerHook = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CRM' | 'CUSTOMERS' | 'INVENTORY' | 'CONSIGNMENTS'>('DASHBOARD');
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === '/dashboard') {
      setActiveTab('DASHBOARD');
      setIsNavigating(false);
    }
    else if (pathname === '/crm') {
      setActiveTab('CRM');
      setIsNavigating(false);
    }
    else if (pathname.startsWith('/customers')) {
      setActiveTab('CUSTOMERS');
      setIsNavigating(false);
    }
    else if (pathname.startsWith('/inventory')) {
      setActiveTab('INVENTORY');
      setIsNavigating(false);
    }
    else if (pathname.startsWith('/consignments')) {
      setActiveTab('CONSIGNMENTS');
      setIsNavigating(false);
    }
    else {
      setActiveTab('DASHBOARD');
      setIsNavigating(false);
    }
  }, [pathname]);

  const handleNavigation = (path: string, tabName: 'DASHBOARD' | 'CRM' | 'CUSTOMERS' | 'INVENTORY' | 'CONSIGNMENTS') => {
    // Show loading for heavy tabs (Dashboard and CRM)
    if (tabName === 'DASHBOARD' || tabName === 'CRM') {
      setIsNavigating(true);
    }
    routerHook.push(path);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => handleNavigation('/dashboard', 'DASHBOARD')}
        disabled={isNavigating}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 flex items-center gap-2 ${
          activeTab === 'DASHBOARD'
            ? 'text-brand shadow-lg'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        } ${isNavigating ? 'opacity-75 cursor-not-allowed' : ''}`}
      >
        {isNavigating && activeTab !== 'DASHBOARD' ? (
          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : null}
        DASHBOARD
      </button>
      <button
        onClick={() => handleNavigation('/crm', 'CRM')}
        disabled={isNavigating}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 flex items-center gap-2 ${
          activeTab === 'CRM'
            ? 'text-brand shadow-lg'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        } ${isNavigating ? 'opacity-75 cursor-not-allowed' : ''}`}
      >
        {isNavigating && activeTab !== 'CRM' ? (
          <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
        ) : null}
        CRM
      </button>
      <button
        onClick={() => routerHook.push('/customers')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
          activeTab === 'CUSTOMERS'
            ? 'text-brand shadow-lg'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        DATABASE
      </button>
      <button
        onClick={() => routerHook.push('/inventory')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
          activeTab === 'INVENTORY'
            ? 'text-brand shadow-lg'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        INVENTORY
      </button>
      <button
        onClick={() => routerHook.push('/consignments')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
          activeTab === 'CONSIGNMENTS'
            ? 'text-brand shadow-lg'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        CONSIGNMENTS
      </button>
    </div>
  );
} 