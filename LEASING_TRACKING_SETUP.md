# Leasing-Only Conversion Tracking Setup

This setup ensures conversion tracking is **ONLY** for the leasing showroom section (`/leasing/showroom`).

## Architecture Overview

```
/leasing/showroom/*               Other Parts of App
     │                                   │
     │ ✅ GTM Loads                      │ ❌ No GTM
     │ ✅ GCLID Captured                 │ ❌ No GCLID
     │ ✅ Conversions Tracked            │ ❌ No Tracking
     │                                   │
     └──────────────┬──────────────────┘
                    │
                    ↓
        /api/leasing/track-conversion
                    │
                    ↓ (Validates source)
              Google Ads API
```

## Files Created

### 1. Leasing-Specific Tracking Utilities
**`/utils/leasing-tracking.ts`**
- `captureGclidForLeasing()` - Captures GCLID from URL
- `getLeasingGclid()` - Retrieves stored GCLID
- `trackLeasingConversion()` - Sends conversion to API
- `pushLeasingEvent()` - Pushes events to GTM dataLayer

### 2. Leasing Tracking Initializer
**`/components/leasing/LeasingTrackingInit.tsx`**
- Client component that runs on leasing pages only
- Automatically captures GCLID when user arrives

### 3. Leasing-Specific API Route
**`/app/api/leasing/track-conversion/route.ts`**
- Only accepts conversions with `source: 'leasing_showroom'`
- Validates and sends to Google Ads API
- Returns 403 error if called from non-leasing sources

### 4. Updated Layout
**`/app/leasing/showroom/layout.tsx`**
- Loads GTM with leasing identifier
- Initializes GCLID capture
- Only affects `/leasing/showroom/*` routes

---

## How It Works

### Step 1: User Arrives from Google Ad
```
User clicks ad → Lands on /leasing/showroom?gclid=ABC123
                           ↓
                  GCLID captured & stored
                  (sessionStorage + cookie)
```

### Step 2: User Interacts with Page
```
User clicks "Call Now" button
           ↓
trackLeasingConversion('PHONE_CALL', 100)
           ↓
Retrieves stored GCLID
           ↓
Sends to /api/leasing/track-conversion
           ↓
API validates source = 'leasing_showroom'
           ↓
Sends conversion to Google Ads
```

### Step 3: Conversion Appears in Google Ads
```
Google Ads Dashboard → Conversions → "Leasing Phone Call"
```

---

## Usage Example

### In Vehicle Detail Page

```typescript
// app/leasing/showroom/[vehicleId]/page.tsx

'use client';

import { trackLeasingConversion, pushLeasingEvent } from '@/utils/leasing-tracking';

export default function VehicleDetailPage() {
  const vehicle = /* ... your vehicle data ... */;

  // Track phone call conversion
  const handlePhoneClick = () => {
    trackLeasingConversion('PHONE_CALL', 100, {
      vehicleId: vehicle.id,
      make: vehicle.make,
      model: vehicle.model_family,
      monthlyRate: vehicle.monthly_lease_rate,
    });

    // Also push to GTM for additional tracking
    pushLeasingEvent('phone_call_click', {
      vehicle_id: vehicle.id,
      vehicle_make: vehicle.make,
      monthly_rate: vehicle.monthly_lease_rate,
    });
  };

  // Track WhatsApp conversion
  const handleWhatsAppClick = () => {
    trackLeasingConversion('WHATSAPP', 100, {
      vehicleId: vehicle.id,
      make: vehicle.make,
      model: vehicle.model_family,
    });

    pushLeasingEvent('whatsapp_click', {
      vehicle_id: vehicle.id,
    });
  };

  return (
    <div>
      {/* Your existing JSX */}
      <a 
        href="tel:+971561742746" 
        onClick={handlePhoneClick}
        className="cta-button call-button"
      >
        CALL US
      </a>

      <a 
        href="https://wa.me/971561742746"
        onClick={handleWhatsAppClick}
        className="cta-button whatsapp-button"
      >
        WHATSAPP
      </a>
    </div>
  );
}
```

---

## Environment Variables Required

Add these to your `.env.local` (and Vercel):

```bash
# Google Ads API Credentials
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_DEVELOPER_TOKEN=your_developer_token
GOOGLE_ADS_ACCESS_TOKEN=your_access_token
GOOGLE_ADS_CLIENT_ID=your_client_id
GOOGLE_ADS_CLIENT_SECRET=your_client_secret
GOOGLE_ADS_REFRESH_TOKEN=your_refresh_token

# Leasing Conversion Action IDs (from Google Ads)
CONVERSION_ACTION_PHONE_CALL=123456789
CONVERSION_ACTION_WHATSAPP=987654321
CONVERSION_ACTION_VEHICLE_VIEW=111111111
CONVERSION_ACTION_PAGE_VIEW=222222222
```

---

## GTM Configuration (Alternative to API Route)

If you prefer using GTM only (no API route needed):

### In GTM, create triggers that ONLY fire on leasing pages:

#### Trigger 1: Leasing Phone Call
```
Type: Click - All Elements
Fires on: Some Clicks
Conditions:
  - Page Path starts with /leasing/showroom
  - Click URL contains tel:
```

#### Trigger 2: Leasing WhatsApp
```
Type: Click - All Elements
Fires on: Some Clicks
Conditions:
  - Page Path starts with /leasing/showroom
  - Click URL contains whatsapp
```

#### Trigger 3: Leasing Page View
```
Type: Page View
Fires on: Some Page Views
Conditions:
  - Page Path starts with /leasing/showroom
```

### Create Conversion Tags in GTM:
```
Tag Type: Google Ads Conversion Tracking
Conversion ID: AW-XXXXXXXXXX
Conversion Label: Your_Label_Here
Trigger: [Select the leasing-specific trigger above]
```

---

## Why This Approach?

### ✅ Isolated to Leasing Only
- GCLID only captured on `/leasing/showroom/*`
- Conversions only sent from leasing pages
- No interference with other parts of your app

### ✅ Flexible
- Works with GTM (simpler) OR API route (more accurate)
- Can track multiple conversion types
- Can include vehicle-specific data

### ✅ Secure
- API route validates source before processing
- Prevents accidental conversions from other sections
- Environment variables keep credentials safe

---

## Testing

### 1. Test GCLID Capture
```javascript
// In browser console on /leasing/showroom page:
sessionStorage.getItem('leasing_gclid')
// Should return the GCLID if present in URL
```

### 2. Test Conversion Tracking
```javascript
// In browser console:
import { trackLeasingConversion } from '@/utils/leasing-tracking';
trackLeasingConversion('PHONE_CALL', 100);
// Check network tab for API call
```

### 3. Test GTM Events
```javascript
// In browser console:
dataLayer
// Should show leasing events with section: 'leasing_showroom'
```

### 4. Verify in Google Ads
- Wait 3-24 hours
- Go to Google Ads → Conversions
- Check for test conversions

---

## Next Steps

1. **Option A: Use GTM Only (Recommended for Start)**
   - Set up conversion actions in Google Ads
   - Configure triggers in GTM (scoped to /leasing/showroom)
   - No code changes needed!

2. **Option B: Add Server-Side Tracking**
   - Set up Google Ads API credentials
   - Add environment variables
   - Update vehicle detail page with tracking calls

3. **Option C: Hybrid (Best of Both)**
   - Use GTM for simple conversions (clicks, page views)
   - Use API route for high-value conversions (form submissions)

---

## Questions?

- GCLID capture happens automatically when user lands on leasing pages
- Conversions only tracked when user came from Google Ads (has GCLID)
- No tracking occurs on other parts of your app (CRM, etc.)
- Cookie scoped to `/leasing/showroom` path only

