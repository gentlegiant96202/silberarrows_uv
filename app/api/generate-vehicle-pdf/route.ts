import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import fs from 'fs';
import path from 'path';

// Helper: Build Vehicle Showcase HTML with leasing focus
function buildVehicleShowcaseHtml(
  vehicle: any,
  logoSrc: string,
  formatDate: (dateString: string) => string,
  formatCurrency: (amount: number) => string
): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vehicle Showcase - ${vehicle.vehicle_model || 'Vehicle'}</title>
        <style>
          /* Using system fonts for better PDF compatibility */
          
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
              font-family: Arial, sans-serif;
              background: #000000;
              color: #ffffff;
              min-height: 100vh;
              padding: 20px;
              line-height: 1.4;
          }
          
          /* Page break spacing with black background */
          @page {
              margin: 0;
              background: #000000;
          }
          
          /* Ensure all page margins and spacing use black background */
          html, body {
              background: #000000;
              margin: 0;
              padding: 0;
          }
          
          .showcase-container {
              page-break-inside: avoid;
              padding: 20px 40px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              min-height: calc(100vh - 60px);
              margin: auto 0;
          }
          
          .showcase-container {
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
          
          /* Header Section */
          .header {
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 10px;
              padding: 20px;
              margin-bottom: 20px;
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
              color: #ffffff;
              letter-spacing: -0.8px;
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
          
          .showcase-info {
              text-align: right;
          }
          
          .showcase-info h2 {
              font-size: 18px;
              font-weight: 800;
              color: #f0f0f0;
              margin-bottom: 6px;
              letter-spacing: 0.5px;
          }
          
          .showcase-info p {
              font-size: 11px;
              color: rgba(255, 255, 255, 0.7);
              margin-bottom: 2px;
              font-weight: 500;
          }
          
          .showcase-info .showcase-date {
              font-weight: 600;
              color: rgba(255, 255, 255, 0.8);
          }
          
          .showcase-info .stock-number {
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
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 1px;
          }
          
          /* Card Styling */
          .card {
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 10px;
              padding: 20px;
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
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 10px;
              padding: 20px;
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
              background: rgba(255, 255, 255, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.2);
              border-radius: 10px;
              padding: 20px;
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
              columns: 2;
              column-gap: 25px;
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
              flex-direction: column;
              height: 100vh;
              padding: 20px;
              margin: 0;
              gap: 20px;
              align-items: center;
              justify-content: center;
          }
          
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
        
        <div class="showcase-container">
            <!-- FIRST PAGE: Header + Vehicle Images Gallery + Vehicle Specifications -->
            
            <!-- Header -->
            <div class="header">
                <div class="header-top">
                    <div class="company-info">
                        <img src="${logoSrc}" alt="Logo" class="company-logo">
                        <div class="company-text">
                              <h1 style="font-size: 20px;">SilberArrows Leasing</h1>
                              <p class="company-contact">
                                  +971 4 380 5515<br />
                                  <a href="mailto:leasing@silberarrows.com">leasing@silberarrows.com</a>
                              </p>
                          </div>
                    </div>
                    <div class="showcase-info">
                      <h2>VEHICLE SHOWCASE</h2>
                      <p>Stock: <span class="stock-number">${vehicle.stock_number || 'N/A'}</span></p>
                    </div>
                </div>
                <div class="vehicle-title">
                    <h3>${vehicle.vehicle_model || vehicle.make || 'Vehicle Model'}</h3>
                </div>
            </div>

            <!-- Content Wrapper for First Page -->
            <div class="content-wrapper">
                <!-- First Row: Vehicle Images Gallery (Full Width) -->
                <div class="full-width-section">
                    <h4 class="card-title">Vehicle Images</h4>
                    <div class="main-image">
                        ${vehicle.photos && vehicle.photos.length > 0 ? 
                          `<img src="${vehicle.photos[0].url}" alt="Main vehicle photo" />` : 
                          '<div class="image-placeholder">Main Vehicle Image<br><small>Primary photo will appear here</small></div>'}
                    </div>
                    <div class="thumbnail-grid">
                        ${vehicle.photos && vehicle.photos.length > 1 ? 
                          vehicle.photos.slice(1, 5).map((photo: any, index: number) => 
                            `<div class="thumbnail">
                                <img src="${photo.url}" alt="Vehicle image ${index + 2}" />
                            </div>`
                          ).join('') : 
                          Array.from({ length: 4 }, (_, i) => 
                            `<div class="thumbnail">
                                <div class="image-placeholder" style="font-size: 9px;">Image ${i + 2}</div>
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
                            <span class="spec-value">${vehicle.model_year || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Make</span>
                            <span class="spec-value">${vehicle.make || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Model</span>
                            <span class="spec-value">${vehicle.vehicle_model || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Exterior Color</span>
                            <span class="spec-value">${vehicle.colour || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Interior Color</span>
                            <span class="spec-value">${vehicle.interior_colour || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Mileage</span>
                            <span class="spec-value">${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Fuel Type</span>
                            <span class="spec-value">${vehicle.fuel_type || 'Petrol'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Transmission</span>
                            <span class="spec-value">${vehicle.transmission || 'Automatic'}</span>
                        </div>
                    </div>
                </div>

                <!-- Third Row: Leasing Options & Pricing -->
                <div class="full-width-section">
                    <h4 class="card-title">Leasing Options</h4>
                    <div class="pricing-section">
                        <div class="pricing-header">Available Lease Terms</div>
                        <div class="main-price">
                            <div class="main-price-label">36 Month Lease</div>
                            <div class="main-price-value">
                                <svg class="dirham-symbol" viewBox="0 0 24 24">
                                    <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                                </svg>
                                ${formatCurrency(3500)}/month + VAT
                            </div>
                        </div>
                        <div class="payment-options">
                            <div class="payment-option">
                                <div class="payment-option-label">24 Months</div>
                                <div class="payment-option-value">
                                    <svg class="dirham-symbol" viewBox="0 0 24 24">
                                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                                    </svg>
                                    ${formatCurrency(4200)}/mo
                                </div>
                            </div>
                            <div class="payment-option">
                                <div class="payment-option-label">48 Months</div>
                                <div class="payment-option-value">
                                    <svg class="dirham-symbol" viewBox="0 0 24 24">
                                        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                                    </svg>
                                    ${formatCurrency(3200)}/mo
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fourth Row: What's Included -->
                <div class="full-width-section">
                    <h4 class="card-title">What's Included in Your Lease</h4>
                    <div class="equipment-grid">
                        <div class="equipment-item">Comprehensive Insurance</div>
                        <div class="equipment-item">Vehicle Registration</div>
                        <div class="equipment-item">Regular Maintenance & Service</div>
                        <div class="equipment-item">24/7 Roadside Assistance</div>
                        <div class="equipment-item">Annual Vehicle Inspection</div>
                        <div class="equipment-item">Replacement Vehicle (if needed)</div>
                        <div class="equipment-item">Zero Down Payment</div>
                        <div class="equipment-item">Quick Approval Process</div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>Contact our leasing team for more information</p>
                <div class="contact-info">
                    +971 4 380 5515 • leasing@silberarrows.com
                </div>
            </div>
        </div>

        <!-- ADDITIONAL GALLERY PAGES (if more than 5 images) -->
        ${vehicle.photos && vehicle.photos.length > 5 ? `
        <div class="image-gallery">
            ${(() => {
                const galleryPhotos = vehicle.photos.slice(5);
                const imagePages = [];
                
                for (let i = 0; i < galleryPhotos.length; i += 2) {
                    const pageImages = galleryPhotos.slice(i, i + 2);
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
}


// Helper: Generate Vehicle Showcase PDF and return as Buffer
async function generateVehicleShowcasePdf(vehicleData: any): Promise<Buffer> {
  // Format dates to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Resolve logo
  const logoFileCandidates = [
    path.join(process.cwd(), 'public', 'main-logo.png'),
    path.join(process.cwd(), 'renderer', 'public', 'main-logo.png')
  ];
  let logoSrc = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';
  for (const candidate of logoFileCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        const logoData = fs.readFileSync(candidate);
        const b64 = logoData.toString('base64');
        logoSrc = `data:image/png;base64,${b64}`;
        break;
      }
    } catch {}
  }

  // Build HTML using the template
  console.log('📄 Building HTML content...');
  const htmlContent = buildVehicleShowcaseHtml(vehicleData, logoSrc, formatDate, formatCurrency);
  console.log('📄 HTML content length:', htmlContent.length);

  console.log('📄 Calling PDFShift API...');
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  const resp = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.PDFSHIFT_API_KEY || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: htmlContent,
      format: 'A4',
      margin: '0',
      landscape: false,
      use_print: true,
      delay: 500
    }),
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  
  console.log('📄 PDFShift API response status:', resp.status);
  
  if (!resp.ok) {
    const errText = await resp.text();
    console.error('❌ PDFShift API error:', resp.status, errText);
    throw new Error(`PDFShift API error: ${resp.status} - ${errText}`);
  }
  
  const pdfBuffer = await resp.arrayBuffer();
  return Buffer.from(pdfBuffer);
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Vehicle PDF API called');
    
    const { vehicleId, vehicleData } = await request.json();
    
    console.log('📝 Generating vehicle showcase PDF:', { 
      vehicleId, 
      vehicleModel: vehicleData?.vehicle_model,
      make: vehicleData?.make,
      hasPhotos: !!vehicleData?.photos,
      photosCount: vehicleData?.photos?.length || 0
    });
    
    // Validate required data
    if (!vehicleId || !vehicleData) {
      console.error('❌ Missing required parameters:', { 
        vehicleId: !!vehicleId, 
        vehicleData: !!vehicleData,
        receivedData: Object.keys({ vehicleId, vehicleData })
      });
      return NextResponse.json(
        { error: 'Missing required parameters: vehicleId and vehicleData are required' },
        { status: 400 }
      );
    }

    // Validate PDFShift API key
    if (!process.env.PDFSHIFT_API_KEY) {
      console.error('❌ PDFShift API key not configured');
      return NextResponse.json(
        { error: 'PDFShift API key not configured' },
        { status: 500 }
      );
    }

    console.log('📄 Generating vehicle showcase PDF using PDFShift...');

    // Generate PDF
    const pdfBuffer = await generateVehicleShowcasePdf(vehicleData);
    console.log('✅ Vehicle showcase PDF generated successfully:', { 
      sizeBytes: pdfBuffer.byteLength, 
      sizeMB: (pdfBuffer.byteLength / 1024 / 1024).toFixed(2),
      bufferType: typeof pdfBuffer,
      isBuffer: Buffer.isBuffer(pdfBuffer)
    });

    // Get existing PDF URL to delete old one
    let existingPdfUrl = null;
    try {
      const { data: existingVehicle } = await supabase
        .from('leasing_inventory')
        .select('vehicle_pdf_url')
        .eq('id', vehicleId)
        .single();
      
      existingPdfUrl = existingVehicle?.vehicle_pdf_url;
      console.log('📄 Existing PDF URL:', existingPdfUrl);
    } catch (error) {
      console.warn('⚠️ Could not fetch existing PDF URL:', error);
    }

    // Delete old PDF if it exists
    if (existingPdfUrl) {
      try {
        console.log('🗑️ Deleting old PDF...');
        const url = new URL(existingPdfUrl);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === 'leasing');
        
        if (bucketIndex !== -1 && pathParts[bucketIndex + 1]) {
          const oldPath = pathParts.slice(bucketIndex + 1).join('/');
          console.log('🗑️ Deleting old PDF path:', oldPath);
          
          const { error: deleteError } = await supabase.storage
            .from('leasing')
            .remove([oldPath]);
          
          if (deleteError) {
            console.warn('⚠️ Failed to delete old PDF:', deleteError);
          } else {
            console.log('✅ Old PDF deleted successfully');
          }
        }
      } catch (deleteError) {
        console.warn('⚠️ Error deleting old PDF:', deleteError);
      }
    }

    // Upload PDF to Supabase storage
    let pdfUrl = null;
    try {
      const fileName = `Vehicle_Showcase_${vehicleId}_${Date.now()}.pdf`;
      const filePath = `vehicle-showcases/${fileName}`;

      console.log('☁️ Uploading PDF to storage bucket: leasing');
      console.log('📁 File path:', filePath);

      // Test storage bucket access
      console.log('🔍 Testing storage bucket access...');
      const { data: bucketList, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) {
        console.error('❌ Cannot access storage buckets:', bucketError);
      } else {
        console.log('✅ Available storage buckets:', bucketList?.map(b => b.name));
        const leasingBucket = bucketList?.find(b => b.name === 'leasing');
        console.log('🔍 Leasing bucket exists:', !!leasingBucket);
        if (leasingBucket) {
          console.log('🔍 Leasing bucket details:', leasingBucket);
          
          // Test listing files in the bucket
          const { data: files, error: listError } = await supabase.storage
            .from('leasing')
            .list('', { limit: 5 });
          
          if (listError) {
            console.error('❌ Cannot list files in leasing bucket:', listError);
          } else {
            console.log('✅ Files in leasing bucket:', files?.length || 0, 'items');
            if (files && files.length > 0) {
              console.log('📁 Sample files:', files.slice(0, 3).map(f => f.name));
            }
          }
        }
      }

      console.log('📦 PDF Buffer size:', pdfBuffer.byteLength, 'bytes');
      console.log('📦 PDF Buffer type:', typeof pdfBuffer);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('leasing')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      console.log('📦 Upload result - data:', uploadData);
      console.log('📦 Upload result - error:', uploadError);

      if (uploadError) {
        console.error('❌ Storage upload error:', uploadError);
        console.error('❌ Upload error details:', JSON.stringify(uploadError, null, 2));
        console.log('⚠️ PDF will be downloaded locally but not stored in cloud');
      } else {
        console.log('✅ PDF uploaded successfully:', uploadData);
        
        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('leasing')
          .getPublicUrl(filePath);
        
        pdfUrl = urlData.publicUrl;
        console.log('📄 PDF generated and uploaded:', pdfUrl);
        
        // Save PDF URL to database
        try {
          console.log('💾 Saving PDF URL to database for vehicle:', vehicleId);
          const { error: updateError } = await supabase
            .from('leasing_inventory')
            .update({ 
              vehicle_pdf_url: pdfUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', vehicleId);

          if (updateError) {
            console.error('❌ Database update error:', updateError);
            // Don't throw error here, just log it - PDF was generated successfully
          } else {
            console.log('✅ PDF URL saved to database for vehicle:', vehicleId);
          }
        } catch (dbError) {
          console.error('❌ Database error:', dbError);
          // Don't throw error here, just log it - PDF was generated successfully
        }
      }
    } catch (storageError) {
      console.error('❌ Failed to upload PDF to storage:', storageError);
      console.log('⚠️ PDF will be downloaded locally but not stored in cloud');
    }

    console.log('🎉 VEHICLE SHOWCASE PROCESS COMPLETED');
    console.log('📊 Final status: PDF URL =', pdfUrl ? 'SAVED TO CLOUD & DATABASE' : 'LOCAL DOWNLOAD ONLY');

    // Return JSON response with PDF URL
    const response = {
      success: true,
      pdfUrl: pdfUrl,
      fileName: `Vehicle_Showcase_${vehicleId}_${Date.now()}.pdf`,
      message: 'Vehicle showcase PDF generated successfully',
      timestamp: new Date().toISOString()
    };

    console.log('📤 Returning response with PDF URL:', pdfUrl);
    console.log('📤 Full response object:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error generating vehicle showcase PDF:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
