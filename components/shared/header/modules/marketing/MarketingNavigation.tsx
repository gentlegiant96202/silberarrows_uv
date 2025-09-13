'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

const marketingTabs = [
  { key: 'design', title: 'CREATIVE HUB' },
  { key: 'call_log', title: 'CALL LOG' },
  { key: 'uv_catalog', title: 'UV CATALOG' },
  { key: 'content_pillars', title: 'CONTENT PILLARS' },
  { key: 'blog', title: 'BLOG' },
  { key: 'email', title: 'EMAIL SIGNATURE' }
];

interface MarketingNavigationProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

function MarketingNavigationContent({ activeTab: propActiveTab, onTabChange: propOnTabChange }: MarketingNavigationProps = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('design');

  // Use URL-based navigation for marketing
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'design';
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const handleTabChange = (tabKey: string) => {
    if (propOnTabChange) {
      // Use provided callback if available
      propOnTabChange(tabKey);
    } else {
      // Default: Update URL search params
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('tab', tabKey);
      router.push(`${pathname}?${newSearchParams.toString()}`);
    }
  };

  const currentActiveTab = propActiveTab || activeTab;

  return (
    <div className="flex gap-1.5">
      {marketingTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => handleTabChange(tab.key)}
          className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
            currentActiveTab === tab.key
              ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300'
              : 'text-white/70 hover:text-white hover:bg-black/60'
          }`}
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
}

export default function MarketingNavigation(props: MarketingNavigationProps = {}) {
  return (
    <Suspense fallback={
      <div className="flex gap-1.5">
        {marketingTabs.map((tab) => (
          <div
            key={tab.key}
            className="px-4 py-1.5 rounded-full font-medium text-xs md:text-sm bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap text-white/70 animate-pulse"
          >
            {tab.title}
          </div>
        ))}
      </div>
    }>
      <MarketingNavigationContent {...props} />
    </Suspense>
  );
} 