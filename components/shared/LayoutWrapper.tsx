"use client";
import { usePathname } from 'next/navigation';
import Header from '@/components/shared/header/Header';

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
  
  return (
    <>
      {/* Persistent Header - never re-mounts, eliminates glitching */}
      {shouldShowHeader && <Header />}
      
      {/* Page Content */}
      <div className={shouldShowHeader ? 'min-h-[calc(100vh-72px)]' : 'min-h-screen'}>
        {children}
      </div>
    </>
  );
}
