import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function generatePaymentOptionsHTML(vehicle: any): string {
  const formatAmount = (value: any) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  };

  const deposit = formatAmount(vehicle.security_deposit);
  const buyout = formatAmount(vehicle.buyout_price);

  const cards: string[] = [];

  if (deposit) {
    cards.push(`
      <div class="payment-option">
          <div class="payment-option-label">Security Deposit</div>
          <div class="payment-option-value">
              <svg viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" style="width:16px;height:16px;flex:0 0 auto;">
                  <path fill="#ffffff" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z" />
              </svg>
              ${deposit}
          </div>
      </div>
    `);
  }

  if (buyout) {
    cards.push(`
      <div class="payment-option">
          <div class="payment-option-label">Buyout Price</div>
          <div class="payment-option-value">
              <svg viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" style="width:16px;height:16px;flex:0 0 auto;">
                  <path fill="#ffffff" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z" />
              </svg>
              ${buyout}
          </div>
      </div>
    `);
  }

  if (!cards.length) {
    return '';
  }

  return `<div class="payment-options">${cards.join('')}</div>`;
}

function normalizeImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('/api/storage-proxy?url=')) {
    try {
      const params = new URLSearchParams(url.split('?')[1]);
      const original = params.get('url');
      if (original) {
        return original;
      }
    } catch {
      return url;
    }
  }
  return url.split('?')[0];
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
          console.log('✅ Loaded logo from file system:', candidate);
          break;
        }
      } catch (err) {
        console.log('⚠️ Failed to load logo from:', candidate);
      }
    }
    
    console.log('📝 Vehicle PDF API called (UV layout)');
    const { vehicleId, vehicleData } = await request.json();

    if (!vehicleId || !vehicleData) {
      return NextResponse.json(
        { error: 'Missing vehicleId or vehicleData' },
        { status: 400 }
      );
    }

    const vehicle = vehicleData;

    if (vehicle.key_equipment && typeof vehicle.key_equipment === 'string') {
      vehicle.key_equipment = vehicle.key_equipment
        .split(/\n|,/)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
    }

    if (vehicle.photos && Array.isArray(vehicle.photos)) {
      vehicle.photos = vehicle.photos.map((photo: any) => ({
        ...photo,
        url: normalizeImageUrl(photo.url)
      }));
    }

    const heroPhotos = (vehicle.photos || []).slice(0, 5);
    const galleryPhotos = (vehicle.photos || []).slice(5, 20);
    const monthlyLease = typeof vehicle.monthly_lease_rate === 'number' ? vehicle.monthly_lease_rate : null;

    const toTitle = (s: string) => s.toLowerCase().replace(/^.|\s.*/g, t => t.toUpperCase()) || s;

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
              padding: 0;
              line-height: 1.4;
          }
          
          @page {
              margin: 0;
                  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%);
          }
          
          html, body {
                  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%);
              margin: 0;
              padding: 0;
          }
          
              .quotation-container {
              page-break-inside: avoid;
              padding: 30px;
              display: flex;
              flex-direction: column;
              justify-content: center;
                  min-height: calc(100vh - 60px);
                  margin: auto 0;
              max-width: 1400px;
          }
          
          .content-wrapper {
              display: flex;
              flex-direction: column;
              gap: 30px;
              flex: 1;
              justify-content: center;
          }
          
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
              padding: 21px 0 12px 0;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 60px;
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

          .full-width-section {
                  background: rgba(255, 255, 255, 0.06);
                  backdrop-filter: blur(20px);
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  border-radius: 16px;
                  padding: 25px;
                  box-shadow: 
                      0 8px 20px rgba(0, 0, 0, 0.1),
                      inset 0 1px 0 rgba(255, 255, 255, 0.1);
              }

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
                  aspect-ratio: 3 / 2;
          }
          
          .main-image img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 10px;
              border: none;
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
              }
          
          /* Image Gallery Section - natural page flow */
          .image-gallery {
              margin-top: 40px;
          }
          
          .image-page {
              page-break-inside: avoid;
              display: flex;
              flex-direction: column;
              height: 100vh;
              padding: 20px;
              margin: 0;
              gap: 20px;
              align-items: center;
              justify-content: center;
          }
          
          /* Only add page break after if it's not the last image page */
          .image-page:not(:last-child) {
              page-break-after: always;
          }
          
          .gallery-image {
              flex: 1;
              width: 90%;
              max-height: 45%;
              min-height: 300px;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
          }
          
          /* When only one image on a page, make it larger and center it */
          .image-page .gallery-image:only-child {
              max-height: 80%;
              min-height: 500px;
              margin: auto 0;
          }
          
          .gallery-image img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }

          .specs-grid {
              display: grid;
                  grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px 20px;
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
          
          .pricing-section {
              background: rgba(255, 255, 255, 0.08);
              backdrop-filter: blur(25px);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 16px;
              padding: 25px;
              margin-bottom: 25px;
              box-shadow: 
                  0 8px 20px rgba(0, 0, 0, 0.1),
                  inset 0 1px 0 rgba(255, 255, 255, 0.1);
              position: relative;
              overflow: hidden;
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

              .main-price-value {
                  font-size: 20px;
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

              .price-note {
                  font-size: 9px;
                  font-weight: 600;
                  color: rgba(255, 255, 255, 0.6);
                  text-align: center;
                  margin-top: 4px;
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
          
              .payment-option-value {
              font-size: 12px;
                  font-weight: 800;
                  color: #ffffff;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  line-height: 1.2;
              }

              .payment-option-value svg {
                  width: 16px;
                  height: 16px;
                  flex: 0 0 auto;
              }

              .mileage-info {
                  margin-top: 12px;
                  padding: 10px;
                  background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.08);
                  border-radius: 8px;
              }

              .mileage-item {
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  gap: 8px;
              padding: 6px 0;
                  font-size: 10px;
              }

              .mileage-label {
                  color: rgba(255, 255, 255, 0.7);
                  font-weight: 500;
              }

              .mileage-value {
                  color: #ffffff;
                  font-weight: 700;
                  display: flex;
                  align-items: center;
                  gap: 4px;
              }

          .footer {
              background: rgba(255, 255, 255, 0.04);
              backdrop-filter: blur(15px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 12px;
              padding: 10px 20px;
              text-align: center;
                  margin-top: 15px;
              box-shadow: 
                  0 15px 30px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05);
          }
          
          .footer p {
                  font-size: 10px;
                  color: rgba(255, 255, 255, 0.6);
              margin-bottom: 6px;
          }
          
          .contact-info {
              font-size: 11px;
              font-weight: 600;
              background: linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 25%, #b8b8b8 50%, #d0d0d0 75%, #e8e8e8 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
          }
          
              .page-break {
              page-break-before: always;
          }
          
              .equipment-grid {
              display: grid;
                  grid-template-columns: repeat(2, 1fr);
                  gap: 10px 20px;
              }

              .equipment-item {
                  font-size: 11px;
                  color: rgba(255, 255, 255, 0.85);
                  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                  padding-bottom: 6px;
                  margin-bottom: 6px;
          }

          .description-content {
              padding: 0;
              background: transparent;
              border: none;
              border-radius: 0;
              line-height: 1.5;
          }

          .description-text {
              font-size: 11px;
              color: rgba(255, 255, 255, 0.85);
              white-space: pre-wrap;
              word-wrap: break-word;
          }

          .terms-content {
              padding: 14px 16px;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 8px;
          }

          .terms-text {
              font-size: 10px;
              line-height: 1.4;
              color: rgba(255, 255, 255, 0.85);
          }

          /* Marketing Page Styles */
          .benefits-hero {
              text-align: center;
              padding: 0 0 20px 0;
              border-bottom: 2px solid rgba(255, 255, 255, 0.1);
              margin-bottom: 20px;
          }

          .benefits-hero h2 {
              font-size: 26px;
              font-weight: 800;
              background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 15%, #d4d4d4 30%, #b8b8b8 50%, #d4d4d4 70%, #f0f0f0 85%, #ffffff 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              letter-spacing: -0.5px;
              filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.4));
              margin-bottom: 8px;
          }

          .benefits-hero p {
              font-size: 12px;
              color: rgba(255, 255, 255, 0.75);
              font-weight: 500;
              line-height: 1.6;
              max-width: 700px;
              margin: 0 auto;
          }

          .benefits-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 25px;
          }

          .benefit-card {
              background: rgba(255, 255, 255, 0.06);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 14px;
              padding: 25px;
              box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
          }

          .benefit-icon {
              width: 40px;
              height: 40px;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%);
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 10px;
              font-size: 20px;
              border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .benefit-title {
              font-size: 13px;
              font-weight: 700;
              color: #ffffff;
              margin-bottom: 6px;
              letter-spacing: 0.3px;
          }

          .benefit-description {
              font-size: 10px;
              color: rgba(255, 255, 255, 0.7);
              line-height: 1.5;
              font-weight: 500;
          }

          .process-section {
              background: rgba(255, 255, 255, 0.08);
              backdrop-filter: blur(25px);
              border: 1px solid rgba(255, 255, 255, 0.15);
              border-radius: 16px;
              padding: 25px;
              margin-bottom: 25px;
          }

          .process-title {
              font-size: 16px;
              font-weight: 700;
              background: linear-gradient(135deg, #ffffff 0%, #e8e8e8 25%, #d0d0d0 50%, #e8e8e8 75%, #ffffff 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              text-align: center;
              margin-bottom: 18px;
              letter-spacing: 0.5px;
          }

          .process-steps {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
          }

          .process-step {
              text-align: center;
              position: relative;
          }

          .step-number {
              width: 36px;
              height: 36px;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 8px;
              font-size: 14px;
              font-weight: 800;
              color: #ffffff;
          }

          .step-title {
              font-size: 11px;
              font-weight: 700;
              color: #ffffff;
              margin-bottom: 4px;
          }

          .step-description {
              font-size: 9px;
              color: rgba(255, 255, 255, 0.7);
              line-height: 1.4;
              font-weight: 500;
          }

          .cta-section {
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
              backdrop-filter: blur(25px);
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 16px;
              padding: 25px;
              text-align: center;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          }

          .cta-title {
              font-size: 18px;
              font-weight: 800;
              background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%, #ffffff 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
          }

          .cta-description {
              font-size: 11px;
              color: rgba(255, 255, 255, 0.8);
              margin-bottom: 15px;
              line-height: 1.6;
              font-weight: 500;
          }

          .cta-contacts {
              display: flex;
              justify-content: center;
              gap: 20px;
              flex-wrap: wrap;
          }

          .cta-contact-item {
              display: flex;
              align-items: center;
              gap: 8px;
              background: rgba(255, 255, 255, 0.08);
              padding: 8px 16px;
              border-radius: 20px;
              border: 1px solid rgba(255, 255, 255, 0.15);
          }

          .cta-contact-icon {
              font-size: 14px;
          }

          .cta-contact-text {
              font-size: 11px;
              font-weight: 700;
              color: #ffffff;
          }
        </style>
    </head>
    <body>
          <div class="quotation-container">
              <div class="header">
                <div class="header-top">
                    <div class="company-info">
                        <div class="company-text">
                              <h1>Mercedes-Benz Leasing</h1>
                          </div>
                          <div class="quotation-details">
                            <h2>LEASE QUOTATION</h2>
                            <p>Chassis: <span class="chassis-number">${vehicle.chassis_number || 'N/A'}</span></p>
                          </div>
                    </div>
                      <img src="${logoSrc}" alt="Logo" class="company-logo" />
                </div>
                <div class="vehicle-title">
                    <h3>${vehicle.vehicle_model || vehicle.make || 'Vehicle Model'}</h3>
                </div>
            </div>

            <div class="content-wrapper">
                  <div class="full-width-section">
                      <h4 class="card-title">Images</h4>
                    <div class="main-image">
                          ${heroPhotos[0] ? `<img src="${heroPhotos[0].url}" alt="Main vehicle photo" />` : '<div class="image-placeholder">Main Vehicle Image<br><small>Primary photo will appear here</small></div>'}
                    </div>
                    <div class="thumbnail-grid">
                          ${heroPhotos.slice(1, 5).map((photo: any, index: number) => `<div class="thumbnail"><img src="${photo.url}" alt="Vehicle image ${index + 2}" /></div>`).join('')}
                    </div>
                </div>

                  <div class="full-width-section">
                    <h4 class="card-title">Vehicle Specifications</h4>
                    <div class="specs-grid">
                          <div class="spec-item"><span class="spec-label">Model Year</span><span class="spec-value">${vehicle.model_year || 'N/A'}</span></div>
                          <div class="spec-item"><span class="spec-label">Make & Model</span><span class="spec-value">${vehicle.make || 'N/A'} ${vehicle.vehicle_model || ''}</span></div>
                          <div class="spec-item"><span class="spec-label">Exterior Color</span><span class="spec-value">${vehicle.colour || 'N/A'}</span></div>
                          <div class="spec-item"><span class="spec-label">Interior Color</span><span class="spec-value">${vehicle.interior_colour || 'N/A'}</span></div>
                          <div class="spec-item"><span class="spec-label">Mileage</span><span class="spec-value">${vehicle.current_mileage_km ? vehicle.current_mileage_km.toLocaleString() + ' km' : (vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : 'N/A')}</span></div>
                          <div class="spec-item"><span class="spec-label">Transmission</span><span class="spec-value">${vehicle.transmission || 'Automatic'}</span></div>
                        </div>
                        </div>
                    </div>
                </div>

          <div class="quotation-container" style="page-break-before: always;">
              <div class="content-wrapper">
                <div class="full-width-section">
                    <div class="pricing-section">
                      <h4 class="pricing-header">Vehicle Price & Lease Options</h4>
                        <div class="main-price">
                            <div class="main-price-label">Monthly Lease Rate</div>
                            <div class="main-price-value" style="display:flex;align-items:center;justify-content:center;gap:8px;">
                              <svg viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:18px;flex:0 0 auto;">
                                  <path fill="#ffffff" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z" />
                                </svg>
                              ${monthlyLease ? monthlyLease.toLocaleString() : 'Contact Us'}/month
                            </div>
                            <div class="price-note" style="color:#ffffff;">+ VAT</div>
                        </div>
                      ${generatePaymentOptionsHTML(vehicle)}
                        ${vehicle.excess_mileage_charges || vehicle.max_mileage_per_year ? `
                        <div class="mileage-info">
                            ${vehicle.max_mileage_per_year ? `<div class="mileage-item"><span class="mileage-label">Annual Mileage Allowance:</span> <span class="mileage-value">${vehicle.max_mileage_per_year.toLocaleString()} km/year</span></div>` : ''}
                          ${vehicle.excess_mileage_charges ? `<div class="mileage-item"><span class="mileage-label">Excess Mileage Charge:</span> <span class="mileage-value"><svg viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg" style="width:10px;height:10px;flex:0 0 auto;"><path fill="#ffffff" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z" /></svg> ${vehicle.excess_mileage_charges.toLocaleString()}/km</span></div>` : ''}
                        </div>
                        ` : ''}
                    </div>

                <!-- Marketing Benefits Section -->
                <div class="benefits-hero">
                    <h2>Why Lease with Silber Arrows?</h2>
                    <p>Experience the ultimate flexibility and peace of mind with our premium leasing solutions. Drive the Mercedes-Benz of your dreams without the commitment of ownership.</p>
                </div>

                <div class="benefits-grid">
                    <div class="benefit-card">
                        <div class="benefit-icon">💰</div>
                        <div class="benefit-title">Lower Monthly Payments</div>
                        <div class="benefit-description">Enjoy significantly lower monthly costs compared to traditional financing, freeing up your budget for other priorities.</div>
                        </div>
                    <div class="benefit-card">
                        <div class="benefit-icon">🔧</div>
                        <div class="benefit-title">All-Inclusive Maintenance</div>
                        <div class="benefit-description">Comprehensive maintenance and servicing included in your lease. No unexpected repair costs or hassle.</div>
                        </div>
                    <div class="benefit-card">
                        <div class="benefit-icon">🛡️</div>
                        <div class="benefit-title">Full Insurance Coverage</div>
                        <div class="benefit-description">Drive with confidence knowing you're fully covered with comprehensive insurance throughout your lease term.</div>
                        </div>
                    <div class="benefit-card">
                        <div class="benefit-icon">🔄</div>
                        <div class="benefit-title">Zero Downpayment</div>
                        <div class="benefit-description">Start driving immediately with no upfront downpayment required. We make leasing accessible and hassle-free for everyone.</div>
                        </div>
                    <div class="benefit-card">
                        <div class="benefit-icon">🏆</div>
                        <div class="benefit-title">Lease to Own Option</div>
                        <div class="benefit-description">Purchase the vehicle at the end of your lease term with our competitive buyout price. Own your dream car on your terms.</div>
                        </div>
                    <div class="benefit-card">
                        <div class="benefit-icon">🚗</div>
                        <div class="benefit-title">Always Drive New</div>
                        <div class="benefit-description">Don't want to own it? Simply return the vehicle at lease end and upgrade to the latest model with cutting-edge technology and features.</div>
                </div>
            </div>
                </div>
            </div>
        </div>

                ${vehicle.description ? `
                <div class="quotation-container" style="page-break-before: always;">
                    <div class="content-wrapper">
                  <div class="full-width-section">
                    <h4 class="card-title">Vehicle Description</h4>
                    <p class="description-text">${vehicle.description}</p>
                </div>
                
                ${vehicle.key_equipment && Array.isArray(vehicle.key_equipment) && vehicle.key_equipment.length > 0 ? `
                  <div class="full-width-section">
                    <h4 class="card-title">Key Equipment & Features</h4>
                    <div class="equipment-grid">
                        ${vehicle.key_equipment.map((item: string) => `<div class="equipment-item">${item}</div>`).join('')}
                    </div>
                </div>
                ` : ''}

                </div>
        </div>
        ` : `
                ${vehicle.key_equipment && Array.isArray(vehicle.key_equipment) && vehicle.key_equipment.length > 0 ? `
                <div class="quotation-container" style="page-break-before: always;">
                    <div class="content-wrapper">
                  <div class="full-width-section">
                    <h4 class="card-title">Key Equipment & Features</h4>
                    <div class="equipment-grid">
                        ${vehicle.key_equipment.map((item: string) => `<div class="equipment-item">${item}</div>`).join('')}
                    </div>
                </div>

                </div>
        </div>
        ` : ''}
        `}

          <!-- REST OF PAGES: Image Gallery Section (2 images per page, no empty pages) -->
          ${galleryPhotos.length > 0 ? `
          <div class="image-gallery">
              ${(() => {
                  const imagePages = [];
                  console.log(`📄 Processing ${galleryPhotos.length} gallery photos for pagination...`);
                  
                  // Group images in pairs (2 per page) for vertical stacking
                  for (let i = 0; i < galleryPhotos.length; i += 2) {
                      const pageImages = galleryPhotos.slice(i, i + 2);
                      console.log(`📄 Page ${Math.floor(i/2) + 1}: ${pageImages.length} images (indices ${i} to ${i + pageImages.length - 1})`);
                      
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
                  
                  console.log(`📄 Total image pages created: ${imagePages.length}`);
                  return imagePages.join('');
              })()}
          </div>
          ` : ''}
          
          <!-- Final Footer -->
          <div class="quotation-container" style="page-break-before: always;">
              <div class="content-wrapper">
                <div class="full-width-section" style="display:flex;align-items:center;justify-content:center;min-height:300px;">
                  <div class="footer">
                    <p>Ready to lease this vehicle?</p>
                    <div class="contact-info">
                        Contact us today: +971 4 380 5515 | leasing@silberarrows.com
                      </div>
                    </div>
                </div>
              </div>
          </div>
    </body>
    </html>
  `;

    // Call renderer service with A4 paper size
    console.log('📄 Calling renderer service with A4 paper size...');
  const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';
  console.log('🔄 Using renderer service at:', rendererUrl);

  const controller = new AbortController();
  const timeoutMs = 120000; // 2 minutes timeout
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Send paper size configuration to renderer
    const renderPayload = {
      html: html,
      options: {
        format: 'A4',
        printBackground: true
      }
    };

  const resp = await fetch(`${rendererUrl}/render-car-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(renderPayload),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  console.log('📄 Renderer service response status:', resp.status);
  if (!resp.ok) {
    const error = await resp.text();
    console.error('📄 Renderer Error Response:', {
      status: resp.status,
      statusText: resp.statusText,
      error: error.slice(0, 500)
    });
    throw new Error(`Renderer service error (${resp.status}): ${error}`);
  }

  const renderResult = await resp.json();
  if (!renderResult.success || !renderResult.pdf) {
    throw new Error('Renderer service returned invalid response');
  }

  // Convert base64 PDF back to buffer
  const pdfBuffer = Buffer.from(renderResult.pdf, 'base64');

    // Upload PDF to Supabase storage (server-side)
    const fileName = `Vehicle_Showcase_${vehicleId}_${Date.now()}.pdf`;
    const filePath = `vehicle-showcases/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('leasing')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('leasing')
      .getPublicUrl(filePath);

    const pdfUrl = urlData.publicUrl;

    // Update database with PDF URL
    const { error: dbError } = await supabase
      .from('leasing_inventory')
      .update({ 
        vehicle_pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicleId);

    if (dbError) {
      console.error('❌ Database update error:', dbError);
    }

    return NextResponse.json({ 
      success: true, 
      pdfUrl,
      vehicleId,
      fileName
    });
  } catch (error) {
    console.error('❌ Error generating vehicle showcase PDF:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}