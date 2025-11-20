"use client";
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Header from '@/components/shared/header/Header';
import Sidebar from '@/components/shared/sidebar/Sidebar';
import { AccountsTabProvider } from '@/lib/AccountsTabContext';
import Snowfall from 'react-snowfall';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Pages that should NOT show the header/sidebar
  const noHeaderPages = [
    '/login',
    '/signup', 
    '/reset-password',
    '/update-password',
    '/module-selection'
  ];
  
  // Check if this is a business card public page
  const isBusinessCardPage = pathname.startsWith('/business-card/');
  
  // Check if this is a dubizzle public page
  const isDubizzlePage = pathname.startsWith('/dubizzle/');
  
  // Check if this is the public leasing showroom
  const isShowroomPage = pathname.startsWith('/leasing/showroom');
  
  const shouldShowHeader = !noHeaderPages.includes(pathname) && !isBusinessCardPage && !isDubizzlePage && !isShowroomPage;
  const shouldShowSidebar = shouldShowHeader; // Sidebar appears with header
  const isAccountsPage = pathname.startsWith('/accounts');
  const isMarketingPage = pathname.startsWith('/marketing');
  const isLeasingPage = pathname.startsWith('/leasing');
  
  const content = (
    <>
      {/* Global Snowfall Effect - falls from left to right */}
      <Snowfall
        color="#ffffff"
        snowflakeCount={100}
        speed={[0.5, 2]}
        wind={[0.5, 2]}
        radius={[0.5, 3]}
        style={{
          position: 'fixed',
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />
      <div className="flex h-screen overflow-hidden bg-black">
        {/* Persistent Sidebar - takes space in layout */}
        {shouldShowSidebar && (
          <Suspense fallback={<div className="w-[64px] flex-shrink-0 bg-black/95 backdrop-blur-md border-r border-white/10" />}>
            <Sidebar />
          </Suspense>
        )}
        
        {/* Main content area with header and page content */}
        <div className="flex-1 flex flex-col min-w-0 w-full relative z-30">
          {/* Persistent Header - stays at top */}
          {shouldShowHeader && (
            <div className="flex-shrink-0">
              <Header />
            </div>
          )}
          
          {/* Page Content - scrollable area (overflow-hidden for marketing and leasing pages to remove scrollbar) */}
          <main className={`flex-1 ${(isMarketingPage || isLeasingPage) && !isShowroomPage ? 'overflow-hidden' : 'overflow-auto'}`}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
  
  // Wrap with AccountsTabProvider if on accounts pages
  if (isAccountsPage) {
    return (
      <AccountsTabProvider>
        {content}
      </AccountsTabProvider>
    );
  }
  
  return content;
}
