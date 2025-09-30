"use client";
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Monitor, Globe } from 'lucide-react';

export default function WorkshopNavigation({ activeTab, onTabChange }: { activeTab?: string; onTabChange?: (tab: string) => void }) {
  const routerHook = useRouter();
  const pathname = usePathname();
  
  const [currentTab, setCurrentTab] = useState<'DASHBOARD' | 'SERVICE' | 'XENTRY'>('DASHBOARD');

  useEffect(() => {
    if (!pathname) return;
    if (pathname === '/workshop/dashboard') setCurrentTab('DASHBOARD');
    else if (pathname.startsWith('/workshop/service-warranty')) setCurrentTab('SERVICE');
    else if (pathname.startsWith('/workshop/xentry')) setCurrentTab('XENTRY');
    else setCurrentTab('DASHBOARD'); // Default fallback
  }, [pathname]);

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
        className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
          currentTab === 'SERVICE'
            ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
            : 'text-white/70 hover:text-white hover:bg-black/60'
        }`}
      >
        SERVICE & WARRANTY
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