"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function CRMNavigation() {
  const routerHook = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'CRM' | 'CUSTOMERS' | 'INVENTORY' | 'CONSIGNMENTS'>('DASHBOARD');

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/dashboard')) setActiveTab('DASHBOARD');
    else if (pathname.startsWith('/customers')) setActiveTab('CUSTOMERS');
    else if (pathname.startsWith('/inventory')) setActiveTab('INVENTORY');
    else if (pathname.startsWith('/consignments')) setActiveTab('CONSIGNMENTS');
    else setActiveTab('CRM');
  }, [pathname]);

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        onClick={() => routerHook.push('/dashboard')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
          activeTab === 'DASHBOARD'
            ? 'text-brand shadow-lg'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        DASHBOARD
      </button>
      <button
        onClick={() => routerHook.push('/')}
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 ${
          activeTab === 'CRM'
            ? 'text-brand shadow-lg'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
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