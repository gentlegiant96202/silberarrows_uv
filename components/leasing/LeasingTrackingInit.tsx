'use client';

import { useEffect } from 'react';
import { captureGclidForLeasing } from '@/utils/leasing-tracking';

/**
 * Client component that initializes leasing-specific tracking
 * Captures GCLID from URL on page load
 */
export default function LeasingTrackingInit() {
  useEffect(() => {
    // Capture GCLID if present in URL
    const gclid = captureGclidForLeasing();
    
    if (gclid) {
      console.log('Leasing tracking initialized with GCLID:', gclid);
    }
  }, []);

  // This component doesn't render anything
  return null;
}

