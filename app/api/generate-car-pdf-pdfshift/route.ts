import { NextRequest, NextResponse } from 'next/server';

// Force this API route to use Node.js runtime (not Edge)
export const runtime = 'nodejs';

// Helper function to generate payment options HTML
function generatePaymentOptionsHTML(car: any): string {
  // Check if car is cash-only (both monthly fields are null)
  const isCashOnly = car.monthly_0_down_aed === null && car.monthly_20_down_aed === null;
  
  if (isCashOnly) {
    return `
    <div class="main-price" style="text-align: center;">
        <div class="main-price-label">Payment Method</div>
        <div class="main-price-value">
            CASH ONLY
        </div>
    </div>`;
  }
  
  // Use database values when available, calculate as fallback
  const p = car.advertised_price_aed || 0;
  if (!p) return '';
  
  // Get monthly payments from database or calculate
  let m0, m20;
  
  if (typeof car.monthly_0_down_aed === 'number' && car.monthly_0_down_aed > 0) {
    m0 = car.monthly_0_down_aed.toLocaleString();
  } else {
    // Fallback calculation
    const r = 0.03 / 12;
    const n = 60;
    m0 = Math.round(p * r / (1 - Math.pow(1 + r, -n))).toLocaleString();
  }
  
  if (typeof car.monthly_20_down_aed === 'number' && car.monthly_20_down_aed > 0) {
    m20 = car.monthly_20_down_aed.toLocaleString();
  } else {
    // Fallback calculation
    const r = 0.03 / 12;
    const n = 60;
    const principal20 = p * 0.8;
    m20 = Math.round(principal20 * r / (1 - Math.pow(1 + r, -n))).toLocaleString();
  }
  
  return `
  <div class="payment-options">
      <div class="payment-option">
          <div class="payment-option-label">Monthly (0% Down)</div>
          <div class="payment-option-value">
              <svg class="dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg">
                  <path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34 14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
              </svg>
              ${m0}/mo
          </div>
      </div>
      <div class="payment-option">
          <div class="payment-option-label">Monthly (20% Down)</div>
          <div class="payment-option-value">
              <svg class="dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg">
                  <path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34 14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
              </svg>
              ${m20}/mo
          </div>
      </div>
  </div>`;
}

// Simple function to convert proxy URLs back to original Supabase URLs
function getOriginalImageUrl(imageUrl: string): string {
  // If it's a storage proxy URL, extract the original URL
  if (imageUrl.startsWith('/api/storage-proxy?url=')) {
    try {
      const urlParams = new URLSearchParams(imageUrl.split('?')[1]);
      const originalUrl = urlParams.get('url');
      if (originalUrl) {
        return originalUrl; // Return original Supabase URL
      }
    } catch (error) {
    }
  }
  
  // Return as-is if not a proxy URL
  return imageUrl;
}

// Fast function - just convert proxy URLs to original Supabase URLs
function optimizeImageForPdf(imageUrl: string): string {
  return getOriginalImageUrl(imageUrl);
}

// Simple function - return original URL and let CSS handle sizing
function getCompressedImageUrl(originalUrl: string): string {
  try {
    if (originalUrl.includes('.supabase.co')) {
      return originalUrl.split('?')[0]; // Remove any existing query params
    }
    return originalUrl;
  } catch {
    return originalUrl;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Load logo from file system
    const fs = await import('fs');
    const path = await import('path');
    const logoFileCandidates = [
      path.join(process.cwd(), 'public', 'MAIN LOGO.png'),
      path.join(process.cwd(), 'public', 'main-logo.png')
    ];
    
    let logoSrc = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1735721054/MAIN_LOGO_krrykw.png';
    
    for (const candidate of logoFileCandidates) {
      try {
        if (fs.existsSync(candidate)) {
          const logoData = fs.readFileSync(candidate);
          const b64 = logoData.toString('base64');
          logoSrc = `data:image/png;base64,${b64}`;
          break;
        }
      } catch (err) {
      }
    }
    const { car, media } = await request.json();
    // Debug car data for potential issues
    if (!car?.id) {
      return NextResponse.json({ error: 'Car ID is missing' }, { status: 400 });
    }
    
    if (!car?.vehicle_model) {
    }
    
    if (car?.description && car.description.length > 5000) {
    }
    
    if (car?.key_equipment && car.key_equipment.length > 3000) {
    }
    
    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json({ error: 'PDFShift API key not configured' }, { status: 500 });
    }
    
    const photos = media.filter((m: any) => m.kind === 'photo');
    // Check for problematic image URLs
    photos.forEach((photo: any, i: number) => {
      if (!photo.url) {
      } else if (photo.url.length > 500) {
      }
    });
    
    // Use all photos but optimize for PDFShift
    // Convert proxy URLs to original Supabase URLs (fast)
    const optimizedPhotos = photos.map((photo: any) => ({
      ...photo,
      url: optimizeImageForPdf(photo.url)
    }));
    // Apply server-side ordering to guarantee consistent PDF order
    // Order: primary first, then sort_order ASC, then created_at ASC
    const orderedPhotos = [...optimizedPhotos].sort((a: any, b: any) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (!a.is_primary && b.is_primary) return 1;
      const aOrder = typeof a.sort_order === 'number' ? a.sort_order : 999999;
      const bOrder = typeof b.sort_order === 'number' ? b.sort_order : 999999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    });
        // Split images: first 5 for main pages, rest for gallery pages (2 per page)  
    let mainPhotos = orderedPhotos.slice(0, 5);
    let galleryPhotos = orderedPhotos.slice(5);
    if (galleryPhotos.length % 2 === 1) {
    }
    
    // Compress ALL images for maximum file size reduction
    mainPhotos = mainPhotos.map((photo: any) => ({
      ...photo,
      url: getCompressedImageUrl(photo.url) // Compress main photos too
    }));
    
    galleryPhotos = galleryPhotos.map((photo: any) => ({
      ...photo,
      url: getCompressedImageUrl(photo.url) // Compress gallery photos
    }));
    optimizedPhotos.slice(0, 3).forEach((photo: any, i: number) => {
    });
    
    const firstPhotoUrl = mainPhotos[0]?.url || '';
    // Helper functions
    const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const equipItems = car.key_equipment ? car.key_equipment.split(/[\n,]+/).map((item: string) => item.trim()) : [];
    
    // Log equipment info after it's defined
    // Build the exact sophisticated HTML template optimized for single page
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vehicle Quotation</title>
          <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
              
              * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
              }
              
              /* Global image optimization for PDF */
              img {
                  image-rendering: -webkit-optimize-contrast;
                  image-rendering: optimize-contrast;
                  image-rendering: crisp-edges;
              }
              
              body {
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%);
                  color: #ffffff;
                  min-height: 100vh;
                  padding: 30px 60px;
                  line-height: 1.4;
              }
              
              /* Page break spacing with black background */
              @page {
                  margin: 0;
                  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%);
              }
              
              /* Ensure all page margins and spacing use black background */
              html, body {
                  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%);
                  margin: 0;
                  padding: 0;
              }
              
              .quotation-container {
                  page-break-inside: avoid;
                  padding: 20px 40px;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  min-height: calc(100vh - 60px);
                  margin: auto 0;
              }
              
              /* Special layout for equipment page - fixed positioning */
              .equipment-page-container {
                  page-break-inside: avoid;
                  padding: 40px 40px 20px 40px;
                  display: flex;
                  flex-direction: column;
                  min-height: 100vh;
                  margin: 0;
                  position: relative;
              }
              
              .equipment-content {
                  flex: 1;
                  padding-top: 0;
              }
              
              .equipment-footer {
                  margin-top: auto;
                  padding-top: 30px;
              }
              
              .quotation-container {
                  max-width: 1400px;
                  margin: 0 auto;
              }
              
              /* Content wrapper with proper spacing */
              .content-wrapper {
                  display: flex;
                  flex-direction: column;
                  gap: 30px;
                  flex: 1;
                  justify-content: center;
              }
              
              /* Remove section spacer - using consistent gap instead */
              
              /* Top Row: Images + Specs Grid Layout */
              .top-row {
                  display: grid;
                  grid-template-columns: 2fr 1fr;
                  gap: 30px;
                  margin-bottom: 0;
              }
              
              /* Header Section */
              .header {
                  background: rgba(255, 255, 255, 0.08);
                  backdrop-filter: blur(25px);
                  border: 1px solid rgba(255, 255, 255, 0.12);
                  border-radius: 20px;
                  padding: 16px 30px;
                  margin-bottom: 20px;
                  box-shadow: 
                      0 25px 50px rgba(0, 0, 0, 0.5),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
              }
              
              .header-top {
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 15px;
              }
              
              .company-info {
                  display: flex;
                  flex-direction: column;
                  gap: 3px;
              }
              
              .company-logo {
                  width: 70px;
                  height: 70px;
                  object-fit: contain;
                  filter: drop-shadow(0 0 25px rgba(255, 255, 255, 0.3));
              }
              
              .company-text h1 {
                  font-size: 24px;
                  font-weight: 800;
                  background: linear-gradient(135deg, #ffffff 0%, #e8e8e8 25%, #d0d0d0 50%, #e8e8e8 75%, #ffffff 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  letter-spacing: -0.8px;
                  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.3));
                  margin-bottom: 3px;
              }
              
              .quotation-details {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
              }
              
              .quotation-details h2 {
                  font-size: 16px;
                  font-weight: 700;
                  color: rgba(255, 255, 255, 0.9);
                  margin-bottom: 2px;
              }
              
              .quotation-details p {
                  font-size: 11px;
                  color: rgba(255, 255, 255, 0.7);
                  font-weight: 500;
              }
              
              .quotation-details .chassis-number {
                  font-weight: 700;
                  color: rgba(255, 255, 255, 0.9);
                  font-size: 12px;
              }
              
              .vehicle-title {
                  text-align: center;
                  padding: 25px 0 16px 0;
                  border-top: 1px solid rgba(255, 255, 255, 0.08);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 50px;
              }
              
              .vehicle-title h3 {
                  font-size: 20px;
                  font-weight: 700;
                  background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 15%, #d4d4d4 30%, #b8b8b8 50%, #d4d4d4 70%, #f0f0f0 85%, #ffffff 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.4));
              }
              
              /* Card Styling */
              .card {
                  background: rgba(255, 255, 255, 0.06);
                  backdrop-filter: blur(20px);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 16px;
                  padding: 25px;
                  box-shadow: 
                      0 20px 40px rgba(0, 0, 0, 0.3),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
                  position: relative;
                  overflow: hidden;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
              }
              
              .card::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  height: 1px;
                  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
              }
              
              /* Full Width Sections */
              .full-width-section {
                  background: rgba(255, 255, 255, 0.06);
                  backdrop-filter: blur(20px);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 16px;
                  padding: 25px;
                  box-shadow: 
                      0 8px 20px rgba(0, 0, 0, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
                  position: relative;
                  overflow: hidden;
              }
              
              .full-width-section::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  height: 1px;
                  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
              }
              
              /* Image Section */
              .image-section {
                  background: rgba(255, 255, 255, 0.06);
                  backdrop-filter: blur(20px);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 16px;
                  padding: 20px;
                  box-shadow: 
                      0 20px 40px rgba(0, 0, 0, 0.3),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
                  height: fit-content;
              }
              
              .main-image {
                  width: 100%;
                  height: 300px;
                  background: rgba(0, 0, 0, 0.3);
                  border: 2px dashed rgba(255, 255, 255, 0.15);
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 15px;
                  position: relative;
                  overflow: hidden;
                  aspect-ratio: 3/2;
              }
              
              .main-image img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  border-radius: 10px;
                  border: none;
              }
              
              .image-placeholder {
                  color: rgba(255, 255, 255, 0.4);
                  font-size: 12px;
                  text-align: center;
                  font-weight: 400;
              }
              
              .thumbnail-grid {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 8px;
                  margin-top: 15px;
              }
              
              .thumbnail {
                  width: 100%;
                  background: rgba(0, 0, 0, 0.3);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                  aspect-ratio: 1.5;
              }
              
              .thumbnail img {
                  width: 100%;
                  height: 100%;
                  object-fit: contain;
                  border-radius: 7px;
                  /* Force max resolution for PDF optimization */
                  max-width: 400px;
                  max-height: 300px;
              }
              
              /* Dirham SVG Symbol Styling */
              .dirham-symbol {
                  display: inline-block;
                  width: 1em;
                  height: 1em;
                  margin-right: 4px;
                  vertical-align: text-bottom;
                  fill: currentColor;
                  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
                  /* Move down to align with number baseline */
                  transform: translateY(0.15em);
              }
              
              .dirham-symbol path {
                  fill: inherit;
              }
              
              /* Make price containers flexbox for perfect alignment */
              .main-price-value {
                  font-size: 18px;
                  font-weight: 800;
                  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 15%, #d4d4d4 30%, #b8b8b8 50%, #d4d4d4 70%, #e8e8e8 85%, #f5f5f5 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  filter: drop-shadow(0 0 25px rgba(255, 255, 255, 0.5));
                  display: flex;
                  align-items: baseline;
                  justify-content: center;
                  line-height: 1.2;
              }
              
              .payment-option-value {
                  font-size: 12px;
                  font-weight: 800;
                  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 20%, #d4d4d4 40%, #b8b8b8 60%, #d4d4d4 80%, #f5f5f5 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
                  display: flex;
                  align-items: baseline;
                  justify-content: center;
                  line-height: 1.2;
              }
              
              /* Make sure SVG inherits gradient styling */
              .main-price-value .dirham-symbol path {
                  fill: url(#silverGradient);
              }
              
              .payment-option-value .dirham-symbol path {
                  fill: url(#silverGradient);
              }
              
              /* Define silver gradient for SVG */
              .svg-gradients {
                  position: absolute;
                  width: 0;
                  height: 0;
                  pointer-events: none;
              }
              
              /* Typography */
              .card-title {
                  font-size: 16px;
                  font-weight: 700;
                  background: linear-gradient(135deg, #ffffff 0%, #e8e8e8 25%, #d0d0d0 50%, #e8e8e8 75%, #ffffff 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  margin-bottom: 15px;
                  padding-bottom: 10px;
                  border-bottom: 1px solid rgba(192, 192, 192, 0.2);
                  letter-spacing: 0.3px;
              }
              
              /* Specifications Grid */
              .specs-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 10px 20px;
                  flex: 1;
                  align-content: center;
              }
              
              .spec-item {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  padding: 6px 0;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
              }
              
              .spec-label {
                  font-size: 11px;
                  font-weight: 500;
                  color: rgba(255, 255, 255, 0.7);
              }
              
              .spec-value {
                  font-size: 11px;
                  font-weight: 600;
                  color: #ffffff;
                  text-align: right;
              }
              
              
              /* Dedicated Pricing Section */
              .pricing-section {
                  background: rgba(255, 255, 255, 0.08);
                  backdrop-filter: blur(25px);
                  border: 1px solid rgba(255, 255, 255, 0.15);
                  border-radius: 16px;
                  padding: 15px;
                  box-shadow: 
                      0 8px 20px rgba(0, 0, 0, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
                  position: relative;
                  overflow: hidden;
              }
              
              .pricing-section::before {
                  content: '';
                  position: absolute;
                  top: 0;
                  left: 0;
                  right: 0;
                  height: 1px;
                  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
              }
              
              .pricing-header {
                  font-size: 12px;
                  font-weight: 700;
                  background: linear-gradient(135deg, #ffffff 0%, #e8e8e8 25%, #d0d4d4 50%, #e8e8e8 75%, #ffffff 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  text-align: center;
                  margin-bottom: 12px;
                  letter-spacing: 0.5px;
              }
              
              .main-price {
                  background: rgba(255, 255, 255, 0.1);
                  backdrop-filter: blur(15px);
                  border: 1px solid rgba(255, 255, 255, 0.2);
                  border-radius: 12px;
                  padding: 12px;
                  margin-bottom: 10px;
                  text-align: center;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              }
              
              .main-price-label {
                  font-size: 10px;
                  font-weight: 600;
                  color: rgba(255, 255, 255, 0.8);
                  margin-bottom: 4px;
              }
              
              
              .payment-options {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 10px;
              }
              
              .payment-option {
                  background: rgba(255, 255, 255, 0.06);
                  backdrop-filter: blur(10px);
                  border: 1px solid rgba(255, 255, 255, 0.12);
                  border-radius: 10px;
                  padding: 10px;
                  text-align: center;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
              }
              
              .payment-option-label {
                  font-size: 9px;
                  font-weight: 600;
                  color: rgba(255, 255, 255, 0.7);
                  margin-bottom: 4px;
              }
              
              
              /* Description */
              .description-text {
                  font-size: 12px;
                  line-height: 1.6;
                  color: rgba(255, 255, 255, 0.85);
                  text-align: justify;
                  font-weight: 400;
                  white-space: pre-wrap;
              }
              
              /* Equipment Grid */
              .equipment-grid {
                  display: grid;
                  grid-template-columns: 1fr 1fr;
                  gap: 10px 20px;
              }
              
              .equipment-item {
                  display: block;
                  break-inside: avoid;
                  padding: 4px 0;
                  font-size: 8.5px;
                  color: rgba(255, 255, 255, 0.8);
                  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                  margin-bottom: 3px;
                  font-weight: 400;
                  line-height: 1.3;
              }
              
              /* Bullet points removed - dashes already present in content */
              .equipment-item:before {
                  content: "";
              }
              
              /* Footer */
              .footer {
                  background: rgba(255, 255, 255, 0.04);
                  backdrop-filter: blur(15px);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  border-radius: 12px;
                  padding: 10px 20px; /* reduced height */
                  text-align: center;
                  margin-top: 15px; /* reduced spacing */
                  box-shadow: 
                      0 15px 30px rgba(0, 0, 0, 0.2),
                      inset 0 1px 0 rgba(255, 255, 255, 0.05);
              }
              
              .footer p {
                  font-size: 10px;
                  color: rgba(255, 255, 255, 0.6);
                  margin-bottom: 6px;
                  font-weight: 400;
              }
              
              .contact-info {
                  font-size: 11px;
                  font-weight: 600;
                  background: linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 25%, #b8b8b8 50%, #d0d0d0 75%, #e8e8e8 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
              }
              
              /* Image Gallery Section - natural page flow */
              .image-gallery {
                  margin-top: 40px;
              }
              
              .image-page {
                  page-break-inside: avoid;
                  display: flex;
                  flex-direction: column; /* Vertical stacking - one below the other */
                  height: 100vh;
                  padding: 20px;
                  margin: 0;
                  gap: 20px; /* Space between stacked images */
                  align-items: center;
                  justify-content: center;
              }
              
              /* Only add page break after if it's not the last image page */
              .image-page:not(:last-child) {
                  page-break-after: always;
              }
              
              .gallery-image {
                  flex: 1;
                  width: 90%; /* Slightly smaller width for better fit */
                  max-height: 45%; /* Each image takes up to 45% of page height */
                  min-height: 300px; /* Minimum height to prevent empty space */
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
              }
              
              /* When only one image on a page, make it larger and center it */
              .image-page .gallery-image:only-child {
                  max-height: 80%; /* Single image can be larger */
                  min-height: 500px;
                  margin: auto 0; /* Center vertically when it's the only image */
              }
              
              .gallery-image img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  display: block;
                  border-radius: 10px;
                  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
              }
          </style>
      </head>
      <body>
          <!-- SVG Gradients Definition -->
          <svg class="svg-gradients">
              <defs>
                  <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#f5f5f5;stop-opacity:1" />
                      <stop offset="15%" style="stop-color:#e8e8e8;stop-opacity:1" />
                      <stop offset="30%" style="stop-color:#d4d4d4;stop-opacity:1" />
                      <stop offset="50%" style="stop-color:#b8b8b8;stop-opacity:1" />
                      <stop offset="70%" style="stop-color:#d4d4d4;stop-opacity:1" />
                      <stop offset="85%" style="stop-color:#e8e8e8;stop-opacity:1" />
                      <stop offset="100%" style="stop-color:#f5f5f5;stop-opacity:1" />
                  </linearGradient>
              </defs>
          </svg>
          
          <div class="quotation-container">
              <!-- FIRST PAGE: Header + Vehicle Images Gallery + Vehicle Specifications -->
              
              <!-- Header -->
              <div class="header">
                  <div class="header-top">
                      <div class="company-info">
                          <div class="company-text">
                                <h1>Approved Used Mercedes-Benz</h1>
                          </div>
                          <div class="quotation-details">
                            <h2>VEHICLE QUOTATION</h2>
                            <p>Chassis: <span class="chassis-number">${car.chassis_number}</span></p>
                          </div>
                      </div>
                      <img src="${logoSrc}" alt="Logo" class="company-logo">
                  </div>
                  <div class="vehicle-title">
                      <h3>${car.vehicle_model || car.model || 'Vehicle Model'}</h3>
                  </div>
              </div>

              <!-- Content Wrapper for First Page -->
              <div class="content-wrapper">
                  <!-- First Row: Vehicle Images Gallery (Full Width) -->
                  <div class="full-width-section">
                      <h4 class="card-title">Images</h4>
                      <div class="main-image">
                          ${firstPhotoUrl ? `<img src="${firstPhotoUrl}" alt="Main vehicle photo" />` : 
                            '<div class="image-placeholder">Main Vehicle Image<br><small>Primary photo will appear here</small></div>'}
                      </div>
                      <div class="thumbnail-grid">
                          ${mainPhotos.slice(1, 5).map((photo: any, index: number) => 
                            `<div class="thumbnail">
                                <img src="${photo.url}" alt="Vehicle image ${index + 2}" />
                            </div>`
                          ).join('')}
                          ${Array.from({ length: Math.max(0, 4 - mainPhotos.slice(1).length) }, (_, i) => 
                            `<div class="thumbnail">
                                <div class="image-placeholder" style="font-size: 9px;">Image ${mainPhotos.slice(1).length + i + 2}</div>
                            </div>`
                          ).join('')}
                      </div>
                  </div>

                  <!-- Second Row: Vehicle Specifications (Full Width) -->
                  <div class="full-width-section">
                      <h4 class="card-title">Specifications</h4>
                      <div class="specs-grid">
                          <!-- Basic Vehicle Info -->
                          <div class="spec-item">
                              <span class="spec-label">Model Year</span>
                              <span class="spec-value">${car.model_year || '—'}</span>
                          </div>
                          <div class="spec-item">
                              <span class="spec-label">Mileage</span>
                              <span class="spec-value">${car.current_mileage_km?.toLocaleString() || '—'} KM</span>
                          </div>
                          <div class="spec-item">
                              <span class="spec-label">Exterior Color</span>
                              <span class="spec-value">${car.colour || '—'}</span>
                          </div>
                          <div class="spec-item">
                              <span class="spec-label">Interior Color</span>
                              <span class="spec-value">${car.interior_colour || '—'}</span>
                          </div>
                          
                          <!-- Engine & Performance -->
                          <div class="spec-item">
                              <span class="spec-label">Engine</span>
                              <span class="spec-value">${car.engine || '—'}</span>
                          </div>
                          <div class="spec-item">
                              <span class="spec-label">Transmission</span>
                              <span class="spec-value">${car.transmission || '—'}</span>
                          </div>
                          <div class="spec-item">
                              <span class="spec-label">Horsepower</span>
                              <span class="spec-value">${car.horsepower_hp ? car.horsepower_hp + ' HP' : '—'}</span>
                          </div>
                          <div class="spec-item">
                              <span class="spec-label">Regional Spec</span>
                              <span class="spec-value">${car.regional_specification || '—'}</span>
                          </div>
                          
                          <!-- Service & Warranty -->
                          <div class="spec-item">
                              <span class="spec-label">Warranty</span>
                              <span class="spec-value">${car.current_warranty ? (() => {
                                const warranty = car.current_warranty.toLowerCase();
                                if (warranty.includes('silberarrows') || warranty.includes('silber arrows')) {
                                  return 'SILBERARROWS EXTENDED WARRANTY AVAILABLE';
                                }
                                return car.current_warranty.toUpperCase();
                              })() : '—'}</span>
                          </div>
                          <div class="spec-item">
                              <span class="spec-label">Service Package</span>
                              <span class="spec-value">${car.current_service ? (() => {
                                const service = car.current_service.toLowerCase();
                                if (service.includes('silberarrows') || service.includes('silber arrows')) {
                                  return 'SILBERARROWS SERVICE-CARE AVAILABLE';
                                }
                                return car.current_service.toUpperCase();
                              })() : '—'}</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <!-- SECOND PAGE: Finance Options + Vehicle Description -->
          ${car.description ? `
          <div class="quotation-container" style="page-break-before: always;">
              <div class="content-wrapper">
                  <!-- Finance Options Section (First) -->
                  <div class="pricing-section">
                      <h4 class="pricing-header">Vehicle Price & Finance Options</h4>
                      <div class="main-price">
                          <div class="main-price-label">Vehicle Price</div>
                          <div class="main-price-value">
                              <svg class="dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
                              </svg>
                              ${car.advertised_price_aed?.toLocaleString() || '—'}
                          </div>
                      </div>
                      ${generatePaymentOptionsHTML(car)}
                  </div>
                  
                  <!-- Spacer between sections -->
                  
                  <!-- Vehicle Description Section (Second) -->
                  <div class="full-width-section">
                      <h4 class="card-title">Description</h4>
                      <p class="description-text">${car.description}</p>
                  </div>
              </div>
          </div>` : `
          <!-- If no description, create finance-only page 2 -->
          <div class="quotation-container" style="page-break-before: always;">
              <div class="content-wrapper">
                  <div class="pricing-section">
                      <h4 class="pricing-header">Vehicle Price & Finance Options</h4>
                      <div class="main-price">
                          <div class="main-price-label">Vehicle Price</div>
                          <div class="main-price-value">
                              <svg class="dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34 14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
                              </svg>
                              ${car.advertised_price_aed?.toLocaleString() || '—'}
                          </div>
                      </div>
                      ${generatePaymentOptionsHTML(car)}
                  </div>
              </div>
          </div>`}

          <!-- THIRD PAGE: Key Equipment + Footer (only if equipment exists) - Fixed Layout -->
          ${equipItems.length ? `
          <div class="equipment-page-container" style="page-break-before: always;">
              <div class="equipment-content">
                  <div class="full-width-section">
                      <h4 class="card-title">Key Equipment & Features</h4>
                      <div class="equipment-grid">
                          ${equipItems.map((item: string) => `<span class="equipment-item">${toTitle(item)}</span>`).join('')}
                      </div>
                  </div>
              </div>
              
              <!-- Fixed Footer at Bottom -->
              <div class="equipment-footer">
                  <div class="footer">
                      <p>This quotation is valid for 30 days from the date of issue</p>
                      <!-- VAT disclaimer removed as per requirement -->
                      <div class="contact-info">
                          +971 4 380 5515 • sales@silberarrows.com • TRN: 100281137800003
                      </div>
                  </div>
              </div>
          </div>
          ` : ''}

          <!-- REST OF PAGES: Image Gallery Section (2 images per page, no empty pages) -->
          ${(() => {
              return galleryPhotos.length > 0;
          })() ? `
          <div class="image-gallery">
              ${(() => {
                  const imagePages = [];
                  // Group images in pairs (2 per page) for vertical stacking
                  for (let i = 0; i < galleryPhotos.length; i += 2) {
                      const pageImages = galleryPhotos.slice(i, i + 2);
                      // Only create a page if we have at least one image
                      if (pageImages.length > 0) {
                          const pageHTML = `
                          <div class="image-page">
                              ${pageImages.map((photo: any, index: number) => `
                              <div class="gallery-image">
                                  <img src="${photo.url}" alt="Vehicle image ${i + index + 6}" />
                              </div>
                              `).join('')}
                          </div>`;
                          imagePages.push(pageHTML);
                      }
                  }
                  return imagePages.join('');
              })()}
          </div>
          ` : ''}
      </body>
      </html>
    `;

        // Call our own renderer service for PDF generation
    // DEBUG: Log the actual HTML structure to see what pages are being created
    const pageBreaks = (html.match(/page-break-before:\s*always/g) || []).length;
    const quotationContainers = (html.match(/quotation-container/g) || []).length;
    const imagePages = (html.match(/image-page/g) || []).length;
    // Log sections of HTML to see the structure
    const htmlLines = html.split('\n');
    const pageBreakLines = htmlLines.filter(line => line.includes('page-break-before'));
    pageBreakLines.forEach((line, i) => {
    });
    
    // Save HTML to inspect the actual structure (development only)
    if (process.env.NODE_ENV === 'development') {
        try {
            const fs = await import('fs');
            const path = await import('path');
            const htmlPath = path.join(process.cwd(), 'debug-pdf.html');
            fs.writeFileSync(htmlPath, html);
        } catch (e) {
        }
    }
    
    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';
    const controller = new AbortController();
    const timeoutMs = 120000; // 2 minutes timeout for our own service
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(`${rendererUrl}/render-car-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        html: html
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ 
        error: `Renderer service error (${response.status}): ${error}` 
      }, { status: 500 });
    }

    const renderResult = await response.json();
    
    if (!renderResult.success || !renderResult.pdf) {
      return NextResponse.json({ 
        error: 'Renderer service returned invalid response',
        details: renderResult 
      }, { status: 500 });
    }

    // Convert base64 PDF back to buffer
    const pdfBuffer = Buffer.from(renderResult.pdf, 'base64');
    const pdfSizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(2);
    // Return PDF as base64 to client - let client handle Supabase upload
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
    
    return NextResponse.json({ 
      success: true, 
      pdfData: base64Pdf,
      carId: car.id,
      pdfStats: {
        imageCount: optimizedPhotos.length,
        fileSizeMB: parseFloat(pdfSizeMB),
        status: parseFloat(pdfSizeMB) < 5 ? 'Optimized' : 'Standard'
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message, 
      stack: error.stack,
      debug: {
        hasApiKey: !!process.env.PDFSHIFT_API_KEY,
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL
      }
    }, { status: 500 });
  }
} 