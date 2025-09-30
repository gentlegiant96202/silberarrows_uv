"use client";
import { useRouter } from 'next/navigation';
import { Monitor, Globe } from 'lucide-react';

export default function XentryNavigation() {
  const routerHook = useRouter();

  return (
    <div className="flex gap-1.5 min-w-fit">
      <button
        onClick={() => routerHook.push('/xentry')}
        className="px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300"
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

