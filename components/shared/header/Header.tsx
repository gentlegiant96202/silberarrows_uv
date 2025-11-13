"use client";
import { usePathname } from 'next/navigation';
import Logo from './sections/Logo';
import SearchBar from './sections/SearchBar';
import WeatherClock from './sections/WeatherClock';
import MusicPlayer from './sections/MusicPlayer';
import ProfileDropdown from './sections/ProfileDropdown';
import FinanceCalculator from './modules/uv-crm/FinanceCalculator';

export default function Header() {
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
  
  // Get department name based on module
  const getDepartmentName = () => {
    switch (currentModule) {
      case 'uv-crm':
        return 'Used Car Department';
      case 'workshop':
        return 'Service Department';
      case 'marketing':
        return 'Marketing Department';
      case 'leasing':
        return 'Leasing Department';
      case 'accounts':
        return 'Accounts Department';
      default:
        return '';
    }
  };

  return (
    <header className={`w-full z-50 ${isModuleSelectionPage ? 'bg-transparent' : 'bg-black/95 backdrop-blur-md'} border-b ${isModuleSelectionPage ? 'border-white/5' : 'border-white/10'}`}>
      <div className="px-4">
        <div className="flex items-center justify-between py-2.5">
          
          {/* Left side - Department name */}
          {isModuleSelectionPage ? (
            <div className="w-12" />
          ) : (
            <div className="flex items-center">
              <h1 className="text-sm font-semibold text-white/90 tracking-wide uppercase">
                {getDepartmentName()}
              </h1>
            </div>
          )}
          
          {/* Right Side Components - Utilities */}
          <div className="flex items-center space-x-3">
            {/* Search Bar */}
            {!isModuleSelectionPage && (
              <SearchBar />
            )}
            
            {/* Finance Calculator for CRM module only */}
            {!isModuleSelectionPage && currentModule === 'uv-crm' && (
              <FinanceCalculator />
            )}
            
            {/* Weather & Clock */}
            <WeatherClock />
            
            {/* Music Player */}
            <MusicPlayer />
            
            {/* Profile */}
            <ProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
} 