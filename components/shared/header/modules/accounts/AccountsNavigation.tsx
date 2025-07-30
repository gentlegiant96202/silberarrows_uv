'use client';

const accountsTabs = [
  { key: 'service', title: 'SERVICE' },
  { key: 'sales', title: 'SALES' },
  { key: 'leasing', title: 'LEASING' }
];

interface AccountsNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AccountsNavigation({ activeTab, onTabChange }: AccountsNavigationProps) {
  return (
    <div className="flex gap-1.5">
      {accountsTabs.map((tab) => (
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