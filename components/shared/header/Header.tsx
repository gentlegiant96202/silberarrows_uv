"use client";
import { usePathname } from 'next/navigation';
import Logo from './sections/Logo';
import SearchBar from './sections/SearchBar';
import WeatherClock from './sections/WeatherClock';
import MusicPlayer from './sections/MusicPlayer';
import ProfileDropdown from './sections/ProfileDropdown';
import CRMNavigation from './modules/uv-crm/CRMNavigation';
import FinanceCalculator from './modules/uv-crm/FinanceCalculator';
import ModuleSwitcher from '@/components/shared/ModuleSwitcher';

export default function Header() {
  const pathname = usePathname();
  
  // Determine current module based on path
  const getCurrentModule = () => {
    if (pathname.startsWith('/workshop')) return 'workshop';
    if (pathname.startsWith('/marketing')) return 'marketing';
    return 'uv-crm'; // default
  };
  
  const currentModule = getCurrentModule();

  return (
    <header className="sticky top-0 z-50 bg-black border-b border-white/10 overflow-visible">
      <div className="px-4 overflow-visible relative">
        <div className="flex flex-wrap items-center py-3 overflow-y-visible">
          
          {/* Logo - Universal */}
          <Logo />
          
          {/* Module-specific Navigation & Search */}
          <div className="flex-1 flex items-center space-x-4">
            {/* Module-specific navigation */}
            {currentModule === 'uv-crm' && <CRMNavigation />}
            {currentModule === 'workshop' && (
              <div className="text-white/60 text-sm">Workshop Navigation Coming Soon</div>
            )}
            {currentModule === 'marketing' && (
              <div className="text-white/60 text-sm">Marketing Navigation Coming Soon</div>
            )}

            {/* Universal Search Bar */}
            <SearchBar />
          </div>
          
          {/* Right Side - Weather, Music, Tools, Profile */}
          <div className="hidden lg:flex items-center gap-3 text-white/80 text-xs">
            {/* Weather & Clock - Universal */}
            <WeatherClock />

            {/* Music Player - Universal */}
            <MusicPlayer />

            {/* Module-specific Tools */}
            {currentModule === 'uv-crm' && <FinanceCalculator />}

            {/* Module Switcher - Universal */}
            <div className="ml-4">
              <ModuleSwitcher />
            </div>
          </div>

          {/* Profile Dropdown - Universal */}
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
} 