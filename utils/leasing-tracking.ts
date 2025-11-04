/**
 * Leasing-specific tracking utilities
 * Only used within /leasing/showroom routes
 */

/**
 * Captures GCLID from URL and stores it for leasing conversions
 * Should be called on leasing page load
 */
export function captureGclidForLeasing(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const gclid = urlParams.get('gclid');
  
  if (gclid) {
    // Store in sessionStorage (scoped to browser session)
    // Using 'leasing_gclid' to avoid conflicts with other tracking
    sessionStorage.setItem('leasing_gclid', gclid);
    
    // Also store in cookie for 90 days (for return visits)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 90);
    document.cookie = `leasing_gclid=${gclid}; expires=${expiryDate.toUTCString()}; path=/leasing/showroom`;
    
    return gclid;
  }
  
  // Try to retrieve from storage
  const storedGclid = sessionStorage.getItem('leasing_gclid');
  return storedGclid;
}

/**
 * Gets the stored GCLID for leasing conversions
 */
export function getLeasingGclid(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try sessionStorage first
  const storedGclid = sessionStorage.getItem('leasing_gclid');
  if (storedGclid) return storedGclid;
  
  // Try cookies
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=');
    if (name === 'leasing_gclid') return value;
  }
  
  return null;
}

/**
 * Track conversion for leasing events
 * @param conversionAction - Type of conversion (PHONE_CALL, WHATSAPP, etc.)
 * @param conversionValue - Optional value in AED
 * @param vehicleData - Optional vehicle information for enhanced tracking
 */
export async function trackLeasingConversion(
  conversionAction: string,
  conversionValue?: number,
  vehicleData?: {
    vehicleId?: string;
    make?: string;
    model?: string;
    monthlyRate?: number;
  }
) {
  const gclid = getLeasingGclid();
  
  if (!gclid) {
    console.log('No GCLID found - user did not come from Google Ads');
    return;
  }

  try {
    const response = await fetch('/api/leasing/track-conversion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversionAction,
        conversionValue,
        gclid,
        conversionDateTime: new Date().toISOString(),
        vehicleData,
        source: 'leasing_showroom', // Identifier for this specific section
      }),
    });

    if (!response.ok) {
      console.error('Failed to track leasing conversion');
    } else {
      console.log(`Leasing conversion tracked: ${conversionAction}`);
    }
  } catch (error) {
    console.error('Error tracking leasing conversion:', error);
  }
}

/**
 * Push event to GTM dataLayer (if using GTM)
 * Only for leasing-specific events
 */
export function pushLeasingEvent(
  eventName: string,
  eventData?: Record<string, any>
) {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    section: 'leasing_showroom',
    ...eventData,
  });
}

// TypeScript declaration for dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

