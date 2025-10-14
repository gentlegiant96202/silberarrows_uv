'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, Suspense, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const marketingTabs = [
  { key: 'design', title: 'CREATIVE HUB', hasDropdown: false },
  { key: 'call_log', title: 'CALL LOG', hasDropdown: false },
  { key: 'uv_catalog', title: 'UV CATALOG', hasDropdown: false },
  { 
    key: 'content_pillars', 
    title: 'CONTENT PILLARS',
    hasDropdown: true,
    dropdownItems: [
      { key: 'myth_buster_monday', title: 'Myth Buster Monday', href: '/marketing/myth-buster-monday' },
      { key: 'tech_tips_tuesday', title: 'Tech Tips Tuesday', href: '/marketing/tech-tips-tuesday' }
    ]
  },
  { key: 'buyer_journey', title: 'BUYER JOURNEY', hasDropdown: false },
  { key: 'business_cards', title: 'BUSINESS CARDS', hasDropdown: false },
  { key: 'blog', title: 'BLOG', hasDropdown: false },
  { key: 'email', title: 'EMAIL SIGNATURE', hasDropdown: false }
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
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const tabRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Use URL-based navigation for marketing
  useEffect(() => {
    // Check if we're on a sub-route first
    if (pathname.includes('/myth-buster-monday')) {
      setActiveTab('content_pillars');
    } else if (pathname.includes('/tech-tips-tuesday')) {
      setActiveTab('content_pillars');
    } else {
      const tabFromUrl = searchParams.get('tab') || 'design';
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, pathname]);

  const handleTabChange = (tabKey: string) => {
    if (propOnTabChange) {
      // Use provided callback if available
      propOnTabChange(tabKey);
    } else {
      // Navigate to main marketing dashboard with the selected tab
      router.push(`/marketing/dashboard?tab=${tabKey}`);
    }
  };

  const handleDropdownItemClick = (href: string) => {
    router.push(href);
  };

  const updateDropdownPosition = (tabKey: string) => {
    const tabElement = tabRefs.current[tabKey];
    if (tabElement) {
      const rect = tabElement.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX
      });
    }
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHoveredTab(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);


  const currentActiveTab = propActiveTab || activeTab;

  return (
    <div className="flex gap-1.5">
      {marketingTabs.map((tab) => (
        <div
          key={tab.key}
          ref={(el) => { tabRefs.current[tab.key] = el; }}
          className="relative"
          onMouseEnter={() => {
            if (tab.hasDropdown) {
              updateDropdownPosition(tab.key);
            }
            setHoveredTab(tab.key);
          }}
          onMouseLeave={() => setHoveredTab(null)}
        >
          <button
            onClick={() => {
              if (tab.hasDropdown) {
                // For dropdown tabs, navigate to main dashboard with that tab
                router.push(`/marketing/dashboard?tab=${tab.key}`);
              } else {
                handleTabChange(tab.key);
              }
            }}
            className={`px-4 py-1.5 rounded-full font-medium text-xs md:text-sm transition-all duration-300 bg-black/40 backdrop-blur-sm border border-white/10 whitespace-nowrap flex items-center gap-1 group ${
              currentActiveTab === tab.key
                ? 'bg-gradient-to-br from-gray-200 via-gray-100 to-gray-400 text-black shadow-lg border-gray-300 scale-105'
                : hoveredTab === tab.key
                ? 'text-white bg-black/60 scale-105 shadow-md'
                : 'text-white/70 hover:text-white hover:bg-black/60 hover:scale-105'
            }`}
          >
            {tab.title}
            {tab.hasDropdown && (
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${
                hoveredTab === tab.key ? 'rotate-180' : ''
              }`} />
            )}
            {/* Active indicator dot */}
            {currentActiveTab === tab.key && (
              <div className="w-1.5 h-1.5 bg-white rounded-full ml-1 animate-pulse" />
            )}
          </button>
          
          {/* Dropdown Menu - Rendered via Portal */}
          {tab.hasDropdown && hoveredTab === tab.key && typeof window !== 'undefined' && createPortal(
            <div 
              className="fixed w-64 bg-black/95 backdrop-blur-md border border-gray-600/50 rounded-lg shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200"
              style={{ 
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                zIndex: 999999
              }}
            >
              {tab.dropdownItems?.map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleDropdownItemClick(item.href)}
                  className="w-full px-4 py-3 text-left text-white/80 hover:text-white hover:bg-gray-700/50 transition-all duration-200 flex items-center justify-between group/item"
                >
                  <span className="font-medium">{item.title}</span>
                  <ChevronDown className="w-4 h-4 rotate-[-90deg] opacity-50" />
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>
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