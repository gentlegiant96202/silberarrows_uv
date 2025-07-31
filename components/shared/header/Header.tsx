"use client";
import { usePathname } from 'next/navigation';
import Logo from './sections/Logo';
import SearchBar from './sections/SearchBar';
import WeatherClock from './sections/WeatherClock';
import MusicPlayer from './sections/MusicPlayer';
import ProfileDropdown from './sections/ProfileDropdown';
import CRMNavigation from './modules/uv-crm/CRMNavigation';
import FinanceCalculator from './modules/uv-crm/FinanceCalculator';
import MarketingNavigation from './modules/marketing/MarketingNavigation';
import AccountsNavigation from './modules/accounts/AccountsNavigation';
import ModuleSwitcher from '@/components/shared/ModuleSwitcher';
import MarketingTicketsDropdown from '@/components/shared/MarketingTicketsDropdown';

interface HeaderProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps = {}) {
  const pathname = usePathname();
  
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

  return (
    <header className={`sticky top-0 z-50 ${isModuleSelectionPage ? 'bg-transparent' : 'bg-black'} border-b ${isModuleSelectionPage ? 'border-white/5' : 'border-white/10'} overflow-visible`}>
      <div className="px-4 overflow-visible relative">
        <div className="flex flex-wrap items-center py-3 overflow-y-visible">
          
          {/* Logo - Universal */}
          <Logo />
          
          {/* Module-specific Navigation & Search */}
          <div className="flex-1 flex items-center space-x-4">
            {/* Module-specific navigation - Hide on module selection page */}
            {!isModuleSelectionPage && (
              <>
                {currentModule === 'uv-crm' && <CRMNavigation />}
                {currentModule === 'workshop' && (
                  <div className="text-white/60 text-sm">Workshop Navigation Coming Soon</div>
                )}
                {currentModule === 'marketing' && activeTab && onTabChange && (
                  <MarketingNavigation activeTab={activeTab} onTabChange={onTabChange} />
                )}
                {currentModule === 'marketing' && (!activeTab || !onTabChange) && (
                  <MarketingNavigation activeTab="design" onTabChange={() => {}} />
                )}
                {currentModule === 'leasing' && (
                  <div className="text-white/60 text-sm">Leasing Navigation Coming Soon</div>
                )}
                {currentModule === 'accounts' && activeTab && onTabChange && (
                  <AccountsNavigation activeTab={activeTab} onTabChange={onTabChange} />
                )}
                {currentModule === 'accounts' && (!activeTab || !onTabChange) && (
                  <AccountsNavigation activeTab="service" onTabChange={() => {}} />
                )}
              </>
            )}

            {/* Search Bar */}
            <SearchBar />
          </div>

          {/* Right Side Components */}
          <div className="flex items-center space-x-4">
            {/* Module Switcher - Hide on module selection page */}
            {!isModuleSelectionPage && <ModuleSwitcher />}
            
            {/* Marketing Tickets Dropdown - Hide on module selection page */}
            {!isModuleSelectionPage && <MarketingTicketsDropdown />}
            
            {/* Finance Calculator for CRM module only - Hide on module selection page */}
            {!isModuleSelectionPage && currentModule === 'uv-crm' && <FinanceCalculator />}
            
            <WeatherClock />
            <MusicPlayer />
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
} 