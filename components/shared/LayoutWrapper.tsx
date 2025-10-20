"use client";
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import Header from '@/components/shared/header/Header';
import Sidebar from '@/components/shared/sidebar/Sidebar';
import { AccountsTabProvider } from '@/lib/AccountsTabContext';

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
  
  const shouldShowHeader = !noHeaderPages.includes(pathname) && !isBusinessCardPage && !isDubizzlePage;
  const shouldShowSidebar = shouldShowHeader; // Sidebar appears with header
  const isAccountsPage = pathname.startsWith('/accounts');
  const isMarketingPage = pathname.startsWith('/marketing');
  const isLeasingPage = pathname.startsWith('/leasing');
  
  const content = (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Persistent Sidebar - takes space in layout */}
      {shouldShowSidebar && (
        <Suspense fallback={<div className="w-[64px] flex-shrink-0 bg-black/95 backdrop-blur-md border-r border-white/10" />}>
          <Sidebar />
        </Suspense>
      )}
      
      {/* Main content area with header and page content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full relative z-30">
        {/* Persistent Header - stays at top */}
        {shouldShowHeader && (
          <div className="flex-shrink-0">
            <Header />
          </div>
        )}
        
        {/* Page Content - scrollable area (overflow-hidden for marketing and leasing pages to remove scrollbar) */}
        <main className={`flex-1 ${isMarketingPage || isLeasingPage ? 'overflow-hidden' : 'overflow-auto'}`}>
          {children}
        </main>
      </div>
    </div>
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
