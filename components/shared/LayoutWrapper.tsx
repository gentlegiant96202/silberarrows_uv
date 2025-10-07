"use client";
import { usePathname } from 'next/navigation';
import Header from '@/components/shared/header/Header';
import { AccountsTabProvider } from '@/lib/AccountsTabContext';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Pages that should NOT show the header
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
  const isAccountsPage = pathname.startsWith('/accounts');
  
  const content = (
    <>
      {/* Persistent Header - fixed at top */}
      {shouldShowHeader && <Header />}
      
      {/* Page Content - add top padding equal to header height */}
      <div className={shouldShowHeader ? 'pt-[72px] min-h-[calc(100vh-72px)]' : 'min-h-screen'}>
        {children}
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
