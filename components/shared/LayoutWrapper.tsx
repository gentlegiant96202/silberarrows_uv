"use client";
import { usePathname } from 'next/navigation';
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
  
  const content = (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Persistent Sidebar - takes space in layout */}
      {shouldShowSidebar && <Sidebar />}
      
      {/* Main content area with header and page content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Persistent Header - stays at top */}
        {shouldShowHeader && (
          <div className="flex-shrink-0">
            <Header />
          </div>
        )}
        
        {/* Page Content - scrollable area */}
        <main className="flex-1 overflow-auto">
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
