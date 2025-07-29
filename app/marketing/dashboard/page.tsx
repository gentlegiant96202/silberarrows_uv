'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import MarketingKanbanBoard from '@/components/modules/marketing/MarketingKanbanBoard';

export default function MarketingDashboard() {
  const [activeTab, setActiveTab] = useState('design');

  const renderContent = () => {
    if (activeTab === 'design') {
      return <MarketingKanbanBoard />;
    }
    
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Coming Soon</h2>
          <p className="text-white/70">
            The {activeTab.toUpperCase().replace('_', ' ')} module is under development
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="max-w-[1800px] mx-auto">
        {renderContent()}
      </div>
    </div>
  );
} 