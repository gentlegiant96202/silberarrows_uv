'use client';

import { Palette, Camera, BookOpen, Mail, Workflow } from 'lucide-react';

const marketingTabs = [
  { key: 'design', title: 'DESIGN', icon: <Palette className="w-4 h-4" /> },
  { key: 'photo', title: 'PHOTO', icon: <Camera className="w-4 h-4" /> },
  { key: 'blog', title: 'BLOG', icon: <BookOpen className="w-4 h-4" /> },
  { key: 'email', title: 'EMAIL', icon: <Mail className="w-4 h-4" /> },
  { key: 'workflow', title: 'WORKFLOW', icon: <Workflow className="w-4 h-4" /> }
];

interface MarketingNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function MarketingNavigation({ activeTab, onTabChange }: MarketingNavigationProps) {
  return (
    <div className="flex items-center gap-1">
      {marketingTabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            activeTab === tab.key
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          {tab.icon}
          <span>{tab.title}</span>
        </button>
      ))}
    </div>
  );
} 