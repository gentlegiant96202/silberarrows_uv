import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { car, media } = await request.json();
    
    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json({ error: 'PDFShift API key not configured' }, { status: 500 });
    }
    
    const photos = media.filter((m: any) => m.kind === 'photo');
    const firstPhotoUrl = photos[0]?.url || '';
    
    // Helper functions
    const toTitle = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const equipItems = car.key_equipment ? car.key_equipment.split(/[\n,]+/).map((item: string) => item.trim()) : [];
    
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
                  padding: 20px 30px;
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
                  align-items: center;
                  gap: 12px;
              }
              
              .company-logo {
                  width: 50px;
                  height: 50px;
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
                  margin-bottom: 4px;
              }
              
              .company-contact {
                  font-size: 10px;
                  color: rgba(255, 255, 255, 0.8);
                  font-weight: 500;
                  line-height: 1.3;
              }
              
              .company-contact a {
                  color: rgba(255, 255, 255, 0.9);
                  text-decoration: none;
              }
              
              .quotation-info {
                  text-align: right;
              }
              
              .quotation-info h2 {
                  font-size: 18px;
                  font-weight: 800;
                  background: linear-gradient(135deg, #f0f0f0 0%, #d4d4d4 25%, #b8b8b8 50%, #d4d4d4 75%, #f0f0f0 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  margin-bottom: 6px;
                  letter-spacing: 0.5px;
              }
              
              .quotation-info p {
                  font-size: 11px;
                  color: rgba(255, 255, 255, 0.7);
                  margin-bottom: 2px;
                  font-weight: 500;
              }
              
              .quotation-info .quotation-date {
                  font-weight: 600;
                  color: rgba(255, 255, 255, 0.8);
              }
              
              .quotation-info .chassis-number {
                  font-weight: 700;
                  color: rgba(255, 255, 255, 0.9);
                  font-size: 12px;
              }
              
              .vehicle-title {
                  text-align: center;
                  padding: 12px 0;
                  border-top: 1px solid rgba(255, 255, 255, 0.08);
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
                  height: 80px;
                  background: rgba(0, 0, 0, 0.3);
                  border: 1px solid rgba(255, 255, 255, 0.08);
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  overflow: hidden;
                  aspect-ratio: 3/2;
              }
              
              .thumbnail img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  border-radius: 7px;
              }
              
              /* Dirham SVG Symbol Styling */
              .dirham-symbol {
                  display: inline-block;
                  width: 0.85em;
                  height: 0.85em;
                  margin-right: 6px;
                  vertical-align: middle;
                  fill: currentColor;
                  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
                  /* Remove vertical nudge for better baseline alignment */
                  transform: translateY(0);
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
                  columns: 2;
                  column-gap: 25px; /* retain gap */
                  column-fill: balance;
              }
              
              .equipment-item {
                  display: block;
                  break-inside: avoid;
                  padding: 4px 0;
                  font-size: 10px;
                  color: rgba(255, 255, 255, 0.8);
                  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
                  margin-bottom: 3px;
                  font-weight: 400;
              }
              
              .equipment-item:before {
                  content: "•";
                  background: linear-gradient(135deg, #e8e8e8 0%, #d0d0d0 50%, #b8b8b8 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                  font-weight: bold;
                  margin-right: 8px;
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
              
              /* Image Gallery Section */
              .image-gallery {
                  margin-top: 40px;
                  page-break-before: always;
              }
              
              .image-page {
                  page-break-inside: avoid;
                  page-break-after: always;
                  display: flex;
                  flex-direction: column;
                  height: 100vh;
                  padding: 0;
                  margin: 0;
                  gap: 0;
              }
              
              .image-page:last-child {
                  page-break-after: avoid;
              }
              
              .gallery-image {
                  flex: 1;
                  width: 100%;
                  display: flex;
                  align-items: center;
                  justify-content: center;
              }
              
              .gallery-image img {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
                  display: block;
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
                          <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" alt="Logo" class="company-logo">
                                                      <div class="company-text">
                                <h1>Approved Used Vehicles</h1>
                                <p class="company-contact">
                                    +971 4 380 5515<br />
                                    <a href="mailto:sales@silberarrows.com">sales@silberarrows.com</a>
                                </p>
                            </div>
                      </div>
                                              <div class="quotation-info">
                            <h2>VEHICLE QUOTATION</h2>
                            <!-- Date removed as per requirement -->
                            <p>Chassis: <span class="chassis-number">${car.chassis_number}</span></p>
                        </div>
                    </div>
                    <div class="vehicle-title">
                        <h3>${car.vehicle_model || car.model || 'Vehicle Model'}</h3>
                    </div>
              </div>

              <!-- Content Wrapper for First Page -->
              <div class="content-wrapper">
                  <!-- First Row: Vehicle Images Gallery (Full Width) -->
                  <div class="full-width-section">
                      <h4 class="card-title">Vehicle Images</h4>
                      <div class="main-image">
                          ${firstPhotoUrl ? `<img src="${firstPhotoUrl}" alt="Main vehicle photo" />` : 
                            '<div class="image-placeholder">Main Vehicle Image<br><small>Primary photo will appear here</small></div>'}
                      </div>
                      <div class="thumbnail-grid">
                          ${photos.slice(1, 5).map((photo: any, index: number) => 
                            `<div class="thumbnail">
                                <img src="${photo.url}" alt="Vehicle image ${index + 2}" />
                            </div>`
                          ).join('')}
                          ${Array.from({ length: Math.max(0, 4 - photos.slice(1).length) }, (_, i) => 
                            `<div class="thumbnail">
                                <div class="image-placeholder" style="font-size: 9px;">Image ${photos.slice(1).length + i + 2}</div>
                            </div>`
                          ).join('')}
                      </div>
                  </div>

                  <!-- Second Row: Vehicle Specifications (Full Width) -->
                  <div class="full-width-section">
                      <h4 class="card-title">Vehicle Specifications</h4>
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
                              <span class="spec-value">${car.current_warranty ? car.current_warranty.replace(/\b\w+/g,(w: string)=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).replace(/Silberarrows/gi,'SilberArrows') : '—'}</span>
                          </div>
                          <div class="spec-item">
                              <span class="spec-label">Service Package</span>
                              <span class="spec-value">${car.current_service ? car.current_service.replace(/\b\w+/g,(w: string)=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).replace(/Silberarrows/gi,'SilberArrows') : '—'}</span>
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
                      ${(() => {
                        const p = car.advertised_price_aed || 0;
                        if (!p) return '';
                        const r = 0.025 / 12;
                        const n = 60;
                        const calc = (pr: number) => Math.round(pr * r / (1 - Math.pow(1 + r, -n))).toLocaleString();
                        const m0 = calc(p);
                        const m20 = calc(p * 0.8);
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
                      })()}
                  </div>
                  
                  <!-- Spacer between sections -->
                  
                  <!-- Vehicle Description Section (Second) -->
                  <div class="full-width-section">
                      <h4 class="card-title">Vehicle Description</h4>
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
                      ${(() => {
                        const p = car.advertised_price_aed || 0;
                        if (!p) return '';
                        const r = 0.025 / 12;
                        const n = 60;
                        const calc = (pr: number) => Math.round(pr * r / (1 - Math.pow(1 + r, -n))).toLocaleString();
                        const m0 = calc(p);
                        const m20 = calc(p * 0.8);
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
                      })()}
                  </div>
              </div>
          </div>`}

          <!-- THIRD PAGE: Key Equipment + Footer -->
          ${equipItems.length ? `
          <div class="quotation-container" style="page-break-before: always;">
              <div class="content-wrapper">
                  <div class="full-width-section">
                      <h4 class="card-title">Key Equipment & Features</h4>
                      <div class="equipment-grid">
                          ${equipItems.map((item: string) => `<span class="equipment-item">${toTitle(item)}</span>`).join('')}
                      </div>
                  </div>
                  
                  <!-- Spacer between sections -->
                  
                  <!-- Footer -->
                  <div class="footer">
                      <p>This quotation is valid for 30 days from the date of issue</p>
                      <!-- VAT disclaimer removed as per requirement -->
                      <div class="contact-info">
                          Approved Used Vehicles • +971 4 380 5515 • sales@silberarrows.com
                      </div>
                  </div>
              </div>
          </div>` : `
          <div class="quotation-container" style="page-break-before: always;">
              <div class="content-wrapper">
                  <!-- Footer (when no equipment) -->
                  <div class="footer">
                      <p>This quotation is valid for 30 days from the date of issue</p>
                      <!-- VAT disclaimer removed as per requirement -->
                      <div class="contact-info">
                          Approved Used Vehicles • +971 4 380 5515 • sales@silberarrows.com
                      </div>
                  </div>
              </div>
          </div>`}

          <!-- REST OF PAGES: Image Gallery Section (as they were) -->
          ${photos.length > 0 ? `
          <div class="image-gallery">
              ${(() => {
                  const imagePages = [];
                  // Group images in pairs (2 per page)
                  for (let i = 0; i < photos.length; i += 2) {
                      const pageImages = photos.slice(i, i + 2);
                      const pageHTML = `
                      <div class="image-page">
                          ${pageImages.map((photo: any, index: number) => `
                          <div class="gallery-image">
                              <img src="${photo.url}" alt="Vehicle image ${i + index + 1}" />
                          </div>
                          `).join('')}
                      </div>`;
                      imagePages.push(pageHTML);
                  }
                  return imagePages.join('');
              })()}
          </div>
          ` : ''}
      </body>
      </html>
    `;

    // Call PDFShift API
    const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PDFSHIFT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        use_print: false
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: `PDFShift API error: ${error}` }, { status: 500 });
    }

    const pdfBuffer = await response.arrayBuffer();
    
    // Return PDF as base64 to client - let client handle Supabase upload
    const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
    
    return NextResponse.json({ 
      success: true, 
      pdfData: base64Pdf,
      carId: car.id 
    });
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 