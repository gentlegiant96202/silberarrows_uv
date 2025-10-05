"use client";
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Logo from './sections/Logo';
import SearchBar from './sections/SearchBar';
import WeatherClock from './sections/WeatherClock';
import MusicPlayer from './sections/MusicPlayer';
import ProfileDropdown from './sections/ProfileDropdown';
import CRMNavigation from './modules/uv-crm/CRMNavigation';
import FinanceCalculator from './modules/uv-crm/FinanceCalculator';
import MarketingNavigation from './modules/marketing/MarketingNavigation';
import AccountsNavigation from './modules/accounts/AccountsNavigation';
import WorkshopNavigation from './modules/workshop/WorkshopNavigation';
import LeasingNavigation from './modules/leasing/LeasingNavigation';

import MarketingTicketsDropdown from '@/components/shared/MarketingTicketsDropdown';
import { useUserRole } from '@/lib/useUserRole';
import { useAccountsTab } from '@/lib/AccountsTabContext';



interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps = {}) {
  const pathname = usePathname();
  // Remove role loading dependency - header renders immediately
  
  // Check if we're on the module selection page
  const isModuleSelectionPage = pathname === '/module-selection';
  
  // Determine current module based on path
  const getCurrentModule = () => {
    if (pathname.startsWith('/workshop')) return 'workshop';
    if (pathname.startsWith('/marketing')) return 'marketing';
    if (pathname.startsWith('/leasing')) return 'leasing';
    if (pathname.startsWith('/accounts')) return 'accounts';
    return 'uv-crm'; // default
  };
  
  const currentModule = getCurrentModule();
  
  // Use accounts tab context when in accounts module
  let accountsTabState = null;
  try {
    if (currentModule === 'accounts') {
      accountsTabState = useAccountsTab();
    }
  } catch (error) {
    // Context not available, use fallback
    accountsTabState = null;
  }

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 ${isModuleSelectionPage ? 'bg-transparent' : 'bg-black'} border-b ${isModuleSelectionPage ? 'border-white/5' : 'border-white/10'} overflow-visible`}>
      <div className="px-4 overflow-visible relative">
        <div className="flex flex-nowrap items-center py-3 overflow-x-auto overflow-y-visible custom-scrollbar-black">
          
          {/* Logo - Universal */}
          <Logo />
          
          {/* Module-specific Navigation & Search - Fixed height container to prevent layout shifts */}
          <div className="flex-1 flex items-center space-x-4 min-w-fit min-h-[40px]">
            {/* Module-specific navigation - Hide on module selection page */}
            {!isModuleSelectionPage && (
              <>
                {/* Static navigation - renders immediately based on current path */}
                <div className="max-w-[805px] min-h-[36px] flex items-center overflow-visible">
                  {currentModule === 'uv-crm' && <CRMNavigation />}
                  {currentModule === 'workshop' && activeTab && onTabChange && (
                    <WorkshopNavigation activeTab={activeTab} onTabChange={onTabChange} />
                  )}
                  {currentModule === 'workshop' && (!activeTab || !onTabChange) && (
                    <WorkshopNavigation activeTab="dashboard" onTabChange={() => {}} />
                  )}
                  {currentModule === 'marketing' && (
                    <MarketingNavigation />
                  )}
                  {currentModule === 'leasing' && (
                    <Suspense fallback={<div className="text-white/60 text-xs px-2">Loading…</div>}>
                      <LeasingNavigation />
                    </Suspense>
                  )}
                  {currentModule === 'accounts' && (
                    <AccountsNavigation 
                      activeTab={accountsTabState?.activeTab || activeTab} 
                      onTabChange={accountsTabState?.setActiveTab || onTabChange} 
                    />
                  )}
                </div>
              </>
            )}

          </div>

          {/* Search Bar - Moved closer to right side for better spacing */}
          {!isModuleSelectionPage && (
            <div className="min-h-[32px] flex items-center mr-2">
              <SearchBar />
            </div>
          )}

          {/* Right Side Components - Fixed height container to prevent layout shifts */}
          <div className="flex items-center space-x-4 min-h-[40px]">
            {/* Marketing Tickets Dropdown - Always render, let component handle permissions */}
            {!isModuleSelectionPage && (
              <div className="min-h-[32px] flex items-center">
                <MarketingTicketsDropdown />
              </div>
            )}
            
            {/* Finance Calculator for CRM module only - Always render when in CRM */}
            {!isModuleSelectionPage && currentModule === 'uv-crm' && (
              <div className="min-h-[32px] flex items-center">
                <FinanceCalculator />
              </div>
            )}
            
            {/* Weather & Clock - Universal - Fixed height */}
            <div className="min-h-[32px] flex items-center">
              <WeatherClock />
            </div>
            
            {/* Music Player - Universal - Fixed height */}
            <div className="min-h-[32px] flex items-center">
              <MusicPlayer />
            </div>
            

            
            {/* Profile - Universal - Fixed height */}
            <div className="min-h-[32px] flex items-center">
              <ProfileDropdown />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 