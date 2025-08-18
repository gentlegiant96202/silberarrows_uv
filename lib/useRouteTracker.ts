'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hook to track route changes and store the current module path in localStorage
 * This ensures that page refreshes return users to their current location
 */
export function useRouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't track certain pages
    const excludedPaths = ['/login', '/signup', '/reset-password', '/update-password', '/module-selection'];
    
    if (excludedPaths.includes(pathname)) {
      return;
    }

    // Determine if this is a valid module path to store
    const isModulePath = (
      pathname.startsWith('/workshop') ||
      pathname.startsWith('/marketing') ||
      pathname.startsWith('/leasing') ||
      pathname.startsWith('/accounts') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/inventory') ||
      pathname.startsWith('/crm') ||
      pathname.startsWith('/consignments') ||
      pathname.startsWith('/customers') ||
      pathname.startsWith('/sales') ||
      pathname.startsWith('/service')
    );

    if (isModulePath) {
      // Store the current path as the last visited module
      localStorage.setItem('lastVisitedModule', pathname);
    }
  }, [pathname]);
}
