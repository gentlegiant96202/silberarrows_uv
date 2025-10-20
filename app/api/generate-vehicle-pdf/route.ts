import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import fs from 'fs';
import path from 'path';

// Increase body size limit for large PDF payloads
export const maxDuration = 300; // 5 minutes timeout
export const dynamic = 'force-dynamic';

// Helper: Build Vehicle Showcase HTML with leasing focus (v2)
function buildVehicleShowcaseHtml(
  vehicle: any,
  logoSrc: string,
  formatDate: (dateString: string) => string,
  formatCurrency: (amount: number) => string,
  galleryPagesHtml: string
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
              padding: 0;
              margin: 0;
              line-height: 1.4;
          }
          
          /* Page break spacing with black background */
          @page {
              size: A4;
              margin: 0;
              background: #000000;
          }
          
          /* Ensure all page margins and spacing use black background */
          html, body {
              background: #000000;
              margin: 0;
              padding: 0;
          }
          
          /* Page wrapper for proper footer positioning */
          .page-wrapper {
              min-height: 297mm;
              position: relative;
              display: flex;
              flex-direction: column;
              padding: 0;
              margin: 0;
          }
          
          .showcase-container {
              page-break-inside: avoid;
              padding: 20px 40px;
              display: flex;
              flex-direction: column;
              justify-content: flex-start;
              flex: 1;
              min-height: calc(297mm - 120px);
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
              font-size: 13px;
              font-weight: 800;
              letter-spacing: 1.5px;
              margin-bottom: 6px;
              background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 15%, #d4d4d4 30%, #b8b8b8 50%, #d4d4d4 70%, #e8e8e8 85%, #f5f5f5 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
          }
          
          .showcase-info p {
              font-size: 11px;
              color: rgba(255, 255, 255, 0.7);
              margin-bottom: 2px;
              font-weight: 500;
          }
          
          .showcase-info .showcase-date {
              font-size: 9px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.5);
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
              margin-bottom: 20px;
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
          
          .price-note {
              font-size: 9px;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.6);
              text-align: center;
              margin-top: 4px;
              letter-spacing: 0.5px;
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
              justify-content: space-between;
              align-items: center;
              padding: 4px 0;
              font-size: 10px;
          }
          
          .mileage-item:not(:last-child) {
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
              margin-bottom: 4px;
              padding-bottom: 4px;
          }
          
          .mileage-label {
              color: rgba(255, 255, 255, 0.7);
              font-weight: 500;
          }
          
          .mileage-value {
              color: rgba(255, 255, 255, 0.9);
              font-weight: 700;
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
          
          .description-content {
              padding: 12px 15px;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 10px;
              line-height: 1.6;
          }
          
          .description-content p {
              font-size: 11px;
              color: rgba(255, 255, 255, 0.85);
              margin: 0;
              white-space: pre-wrap;
              word-wrap: break-word;
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
              padding: 10px 20px;
              text-align: center;
              margin: auto 40px 20px 40px;
              position: relative;
              margin-top: auto;
              box-shadow: 
                  0 15px 30px rgba(0, 0, 0, 0.2),
                  inset 0 1px 0 rgba(255, 255, 255, 0.05);
          }
          
          .footer p {
              font-size: 11px;
              color: rgba(255, 255, 255, 0.8);
              margin-bottom: 6px;
              font-weight: 600;
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

          /* Page break improvements */
          .page-break-before {
              page-break-before: always;
          }
          
          .page-break-after {
              page-break-after: always;
          }
          
          .avoid-break {
              page-break-inside: avoid;
          }
          
          /* Improved section spacing */
          .section-spacing {
              margin-bottom: 30px;
          }
          
          /* Better content organization */
          .content-section {
              margin-bottom: 25px;
              break-inside: avoid;
          }
          
          .two-column-layout {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
          }
          
          @media print {
              .content-section {
                  margin-bottom: 20px;
              }
              
              .two-column-layout {
                  page-break-inside: avoid;
              }
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
        
        <!-- Page wrapper for footer positioning -->
        <div class="page-wrapper">
            <!-- FIRST PAGE: Header + Vehicle Images Gallery + Vehicle Specifications -->
            <div class="showcase-container">
            
            <!-- Header -->
            <div class="header section-spacing">
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
                      <h2>LEASE QUOTATION</h2>
                      <p>Chassis: <span class="stock-number">${vehicle.chassis_number || 'N/A'}</span></p>
                    </div>
                </div>
                <div class="vehicle-title">
                    <h3>${vehicle.vehicle_model || vehicle.make || 'Vehicle Model'}</h3>
                </div>
            </div>

            <!-- Content Wrapper for First Page -->
            <div class="content-wrapper">
                <!-- Vehicle Images Gallery -->
                <div class="full-width-section content-section avoid-break">
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

                <!-- Vehicle Specifications -->
                <div class="full-width-section content-section avoid-break">
                    <h4 class="card-title">Vehicle Specifications</h4>
                    <div class="specs-grid">
                        <!-- Basic Vehicle Info -->
                        <div class="spec-item">
                            <span class="spec-label">Model Year</span>
                            <span class="spec-value">${vehicle.model_year || 'N/A'}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Make & Model</span>
                            <span class="spec-value">${vehicle.make || 'N/A'} ${vehicle.vehicle_model || ''}</span>
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
                            <span class="spec-value">${vehicle.current_mileage_km ? vehicle.current_mileage_km.toLocaleString() + ' km' : (vehicle.mileage ? vehicle.mileage.toLocaleString() + ' km' : 'N/A')}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">Transmission</span>
                            <span class="spec-value">${vehicle.transmission || 'Automatic'}</span>
                        </div>
                    </div>
                </div>

                <!-- Leasing Options & Pricing -->
                <div class="full-width-section content-section avoid-break">
                    <h4 class="card-title">Flexible Leasing Options</h4>
                    <div class="pricing-section">
                        <div class="pricing-header">Your Monthly Investment</div>
                        <div class="main-price">
                            <div class="main-price-label">Monthly Lease Rate</div>
                            <div class="main-price-value">
                                <svg class="dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
                                </svg>
                                ${vehicle.monthly_lease_rate ? formatCurrency(vehicle.monthly_lease_rate) : 'Contact Us'}/month
                            </div>
                            <div class="price-note">+ VAT</div>
                        </div>
                        <div class="payment-options">
                            <div class="payment-option">
                                <div class="payment-option-label">Security Deposit</div>
                                <div class="payment-option-value">
                                    <svg class="dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
                                    </svg>
                                    ${vehicle.security_deposit ? formatCurrency(vehicle.security_deposit) : 'TBD'}
                                </div>
                            </div>
                            <div class="payment-option">
                                <div class="payment-option-label">Buyout Price</div>
                                <div class="payment-option-value">
                                    <svg class="dirham-symbol" viewBox="0 0 344.84 299.91" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/>
                                    </svg>
                                    ${vehicle.buyout_price ? formatCurrency(vehicle.buyout_price) : 'Available'}
                                </div>
                            </div>
                        </div>
                        ${vehicle.excess_mileage_charges || vehicle.max_mileage_per_year ? `
                        <div class="mileage-info">
                            ${vehicle.max_mileage_per_year ? `<div class="mileage-item"><span class="mileage-label">Annual Mileage Allowance:</span> <span class="mileage-value">${vehicle.max_mileage_per_year.toLocaleString()} km/year</span></div>` : ''}
                            ${vehicle.excess_mileage_charges ? `<div class="mileage-item"><span class="mileage-label">Excess Mileage Charge:</span> <span class="mileage-value">${formatCurrency(vehicle.excess_mileage_charges)}/km</span></div>` : ''}
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Premium Leasing Benefits -->
                <div class="full-width-section content-section avoid-break">
                    <h4 class="card-title">Premium Leasing Benefits</h4>
                    <div class="benefits-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px 30px;">
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">Comprehensive Insurance Coverage</div>
                        </div>
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">Full Vehicle Registration</div>
                        </div>
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">Regular Maintenance & Servicing</div>
                        </div>
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">24/7 Roadside Assistance</div>
                        </div>
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">Annual Vehicle Inspection</div>
                        </div>
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">Replacement Vehicle (if available)</div>
                        </div>
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">Flexible Lease Terms</div>
                        </div>
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">Quick Approval Process</div>
                        </div>
                        <div style="padding: 10px; background: rgba(255, 255, 255, 0.04); border-radius: 8px;">
                            <div style="font-size: 11px; font-weight: 600; color: rgba(255, 255, 255, 0.9); margin-bottom: 5px;">Dedicated Account Manager</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>Experience premium leasing with SilberArrows</p>
                <div class="contact-info">
                    📞 +971 4 380 5515 • ✉️ leasing@silberarrows.com • TRN: 100281137800003
                </div>
                <p style="font-size: 9px; margin-top: 8px; color: rgba(255, 255, 255, 0.5);">
                    All prices exclude VAT. Terms and conditions apply. Subject to credit approval.
                </p>
            </div>
        </div>
        </div>

        <!-- PAGE 2: DESCRIPTION & KEY EQUIPMENT -->
        <div class="showcase-container" style="page-break-before: always;">
                <!-- Description Section -->
                ${vehicle.description ? `
                <div class="full-width-section content-section avoid-break">
                    <h4 class="card-title">Vehicle Description</h4>
                    <div class="description-content">
                        <p>${vehicle.description}</p>
                    </div>
                </div>
                ` : ''}

                <!-- Key Equipment Section -->
                ${vehicle.key_equipment && Array.isArray(vehicle.key_equipment) && vehicle.key_equipment.length > 0 ? `
                <div class="full-width-section content-section avoid-break">
                    <h4 class="card-title">Key Equipment & Features</h4>
                    <div class="equipment-grid">
                        ${vehicle.key_equipment.map((item: string) => `<div class="equipment-item">${item}</div>`).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Additional Information -->
                <div class="full-width-section content-section">
                    <h4 class="card-title">Leasing Terms & Conditions</h4>
                    <div class="description-content">
                        <p style="font-size: 10px; line-height: 1.5;">
                            • Minimum lease term: 12 months<br>
                            • Security deposit required upon signing<br>
                            • Comprehensive insurance included<br>
                            • Regular maintenance and servicing included<br>
                            • 24/7 roadside assistance available<br>
                            • Excess mileage charges apply beyond annual allowance<br>
                            • Early termination fees may apply<br>
                            • Subject to credit approval and documentation<br>
                            • Prices exclude 5% VAT<br>
                            • Terms and conditions apply
                        </p>
                    </div>
                </div>

                <!-- Contact Footer for Second Page -->
                <div class="footer" style="margin-top: 30px;">
                    <p>Ready to lease this vehicle?</p>
                    <div class="contact-info">
                        Contact us today: +971 4 380 5515 | leasing@silberarrows.com
                    </div>
                </div>
        </div>

        <!-- ADDITIONAL GALLERY PAGES (if more than 5 images) -->
        ${galleryPagesHtml ? `
        <div class="image-gallery page-break-before">
            ${galleryPagesHtml}
        </div>
        ` : ''}
    </body>
    </html>
  `;
}


// Helper: Generate Vehicle Showcase PDF and return as Buffer
async function generateVehicleShowcasePdf(vehicleData: any): Promise<Buffer> {
  // Preprocess key_equipment: convert string to array
  if (vehicleData.key_equipment && typeof vehicleData.key_equipment === 'string') {
    vehicleData.key_equipment = vehicleData.key_equipment
      .split('\n')
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 0);
  }
  
  // Limit photos to maximum 20 to prevent payload size issues (same as UV inventory)
  if (vehicleData.photos && vehicleData.photos.length > 20) {
    console.log(`⚠️ Limiting photos from ${vehicleData.photos.length} to 20 for PDF generation`);
    vehicleData.photos = vehicleData.photos.slice(0, 20);
  }
  
  // Compress image URLs to reduce PDF size
  const getCompressedImageUrl = (originalUrl: string): string => {
    try {
      if (originalUrl.includes('.supabase.co')) {
        return originalUrl.split('?')[0]; // Remove query params
      }
      return originalUrl;
    } catch {
      return originalUrl;
    }
  };
  
  // Apply compression to all photos
  if (vehicleData.photos && vehicleData.photos.length > 0) {
    vehicleData.photos = vehicleData.photos.map((photo: any) => ({
      ...photo,
      url: getCompressedImageUrl(photo.url)
    }));
    console.log(`✅ Compressed ${vehicleData.photos.length} image URLs for PDF`);
  }
  
  // Preprocess gallery photos: create pages with 2 images each
  let galleryPagesHtml = '';
  if (vehicleData.photos && vehicleData.photos.length > 5) {
    const galleryPhotos = vehicleData.photos.slice(5);
    for (let i = 0; i < galleryPhotos.length; i += 2) {
      const pageImages = galleryPhotos.slice(i, i + 2);
      if (pageImages.length > 0) {
        galleryPagesHtml += `
        <div class="image-page">
            ${pageImages.map((photo: any, index: number) => `
            <div class="gallery-image">
                <img src="${photo.url}" alt="Vehicle image ${i + index + 6}" />
            </div>
            `).join('')}
        </div>`;
      }
    }
  }
  
  // Format dates to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format currency - returns number only (without AED prefix)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
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
  const htmlContent = buildVehicleShowcaseHtml(vehicleData, logoSrc, formatDate, formatCurrency, galleryPagesHtml);
  console.log('📄 HTML content length:', htmlContent.length);

  // Save HTML for debugging
  if (process.env.NODE_ENV === 'development') {
    try {
      const htmlPath = path.join(process.cwd(), 'debug-leasing-pdf.html');
      fs.writeFileSync(htmlPath, htmlContent);
      console.log('💾 HTML saved to debug-leasing-pdf.html for inspection');
    } catch (e) {
      console.log('⚠️ Could not save debug HTML:', e instanceof Error ? e.message : e);
    }
  }

  console.log('📄 Calling renderer service (same as UV inventory)...');
  
  const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';
  console.log('🔄 Using renderer service at:', rendererUrl);
  
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutMs = 120000; // 2 minutes timeout
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  console.log(`📄 Renderer timeout set to ${timeoutMs/1000} seconds`);
  
  const resp = await fetch(`${rendererUrl}/render-car-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html: htmlContent
    }),
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
  const pdfSizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(2);
  
  console.log(`📄 PDF Generated:`);
  console.log(`   Final PDF size: ${pdfSizeMB}MB`);
  console.log(`   ✅ PDF generation successful!`);
  
  return pdfBuffer;
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

    console.log('📄 Generating vehicle showcase PDF...');

    // Generate PDF
    const pdfBuffer = await generateVehicleShowcasePdf(vehicleData);
    console.log('✅ Vehicle showcase PDF generated successfully:', { 
      sizeBytes: pdfBuffer.byteLength, 
      sizeMB: (pdfBuffer.byteLength / 1024 / 1024).toFixed(2),
      bufferType: typeof pdfBuffer,
      isBuffer: Buffer.isBuffer(pdfBuffer)
    });

    // Upload PDF to Supabase storage (server-side - no 6MB client limit)
    const fileName = `Vehicle_Showcase_${vehicleId}_${Date.now()}.pdf`;
    const filePath = `vehicle-showcases/${fileName}`;
    
    console.log('☁️ Uploading PDF to Supabase storage (server-side)...');
    console.log('📁 File path:', filePath);
    console.log('📦 File size:', (pdfBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
    
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

    console.log('✅ PDF uploaded successfully:', uploadData);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('leasing')
      .getPublicUrl(filePath);
    
    const pdfUrl = urlData.publicUrl;
    console.log('📄 PDF URL:', pdfUrl);
    
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
    } else {
      console.log('✅ PDF URL saved to database');
    }
    
    return NextResponse.json({ 
      success: true, 
      pdfUrl: pdfUrl,
      vehicleId: vehicleId,
      fileName: fileName,
      pdfStats: {
        fileSizeMB: parseFloat((pdfBuffer.byteLength / 1024 / 1024).toFixed(2))
      }
    });

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