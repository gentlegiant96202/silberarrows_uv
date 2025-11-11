"use client";
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LeasingKanbanBoard from '@/components/modules/leasing/LeasingKanbanBoard';
import LeasingInventoryBoard from '@/components/modules/leasing/LeasingInventoryBoard';
import LeasingCalculator from '@/components/modules/leasing/LeasingCalculator';
import RouteProtector from '@/components/shared/RouteProtector';

function LeasingPageContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('crm');

  // Sync with URL search params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'crm';
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const renderContent = () => {
    if (activeTab === 'crm') {
      return <LeasingKanbanBoard />;
    }
    
    if (activeTab === 'inventory') {
      return <LeasingInventoryBoard />;
    }
    
    if (activeTab === 'calculator') {
      return <LeasingCalculator />;
    }
    
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-semibold text-white mb-2">Coming Soon</h2>
          <p className="text-white/70">
            The {activeTab.toUpperCase()} module is under development
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-black overflow-hidden flex flex-col">
      {renderContent()}
    </div>
  );
}

export default function LeasingPage() {
  return (
    <RouteProtector moduleName="leasing">
      <Suspense fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-white">Loading...</div>
        </div>
      }>
        <LeasingPageContent />
      </Suspense>
    </RouteProtector>
  );
}
