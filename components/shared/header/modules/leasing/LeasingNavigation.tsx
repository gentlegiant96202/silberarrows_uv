"use client";
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LeasingNavigation() {
  const routerHook = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('crm');

  // Sync with URL search params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'crm';
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    routerHook.push(`/leasing?tab=${tab}`);
  };

  return (
    <div className="flex gap-1 min-w-fit">
      <button
        onClick={() => handleTabChange('crm')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'crm'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        CRM
      </button>
      <button
        onClick={() => handleTabChange('inventory')}
        className={`px-3 py-1.5 rounded-full font-medium text-xs transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          activeTab === 'inventory'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        INVENTORY
      </button>
    </div>
  );
}
