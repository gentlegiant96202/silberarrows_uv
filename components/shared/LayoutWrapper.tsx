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
  
  const shouldShowHeader = !noHeaderPages.includes(pathname);
  const isAccountsPage = pathname.startsWith('/accounts');
  
  const content = (
    <>
      {/* Persistent Header - never re-mounts, eliminates glitching */}
      {shouldShowHeader && <Header />}
      
      {/* Page Content */}
      <div className={shouldShowHeader ? 'min-h-[calc(100vh-72px)]' : 'min-h-screen'}>
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
