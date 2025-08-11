'use client';

const marketingTabs = [
  { key: 'design', title: 'CREATIVE HUB' },
  { key: 'uv_catalog', title: 'UV CATALOG' },
  { key: 'blog', title: 'BLOG' },
  { key: 'email', title: 'EMAIL' }
];

interface MarketingNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MarketingNavigation({ activeTab, onTabChange }: MarketingNavigationProps) {
  return (
    <div className="flex gap-1.5">
      {marketingTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-200 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap ${
            activeTab === tab.key
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