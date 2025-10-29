'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

import MarketingKanbanBoard from '@/components/modules/marketing/MarketingKanbanBoard';
import UVCatalogBoard from '@/components/modules/marketing/UVCatalogBoard';
import CallLogBoard from '@/components/modules/marketing/CallLogBoard';
import ContentPillarsBoard from '@/components/modules/marketing/ContentPillarsBoard';
import BusinessCardBoard from '@/components/modules/marketing/BusinessCardBoard';
import EmailSignatureBoard from '@/components/modules/marketing/EmailSignatureBoard';
import BuyerJourneyCanvas from '@/components/modules/marketing/BuyerJourneyCanvas';
import RouteProtector from '@/components/shared/RouteProtector';
import { MarketingLoadingProvider } from '@/lib/MarketingLoadingContext';

function MarketingDashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('design');

  // Sync with URL search params
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'design';
    setActiveTab(tabFromUrl);
  }, [searchParams]);
  
  // Pass activeTab to the layout header via URL params or context
  // For now, we'll handle tab switching internally in this component

  const renderContent = () => {
    if (activeTab === 'design') {
      return <MarketingKanbanBoard />;
    }
    
    if (activeTab === 'call_log') {
      return <CallLogBoard />;
    }
    
    if (activeTab === 'uv_catalog') {
      return <UVCatalogBoard />;
    }
    
    if (activeTab === 'content_pillars') {
      return <ContentPillarsBoard />;
    }
    
    if (activeTab === 'buyer_journey') {
      return <BuyerJourneyCanvas />;
    }
    
    if (activeTab === 'business_cards') {
      return <BusinessCardBoard />;
    }
    
    if (activeTab === 'email') {
      return <EmailSignatureBoard />;
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
    <div className="h-full bg-black overflow-hidden flex flex-col">
      {renderContent()}
    </div>
  );
}

export default function MarketingDashboard() {
  return (
    <RouteProtector moduleName="marketing">
      <MarketingLoadingProvider>
        <Suspense fallback={
          <div className="h-full bg-black flex items-center justify-center">
            <div className="text-white">Loading...</div>
          </div>
        }>
          <MarketingDashboardContent />
        </Suspense>
      </MarketingLoadingProvider>
    </RouteProtector>
  );
} 