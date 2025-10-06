'use client';

import React from 'react';

// Utility function to generate HTML string that matches the preview component exactly
export const generateMythBusterHTMLString = (props: MythBusterPreviewProps & { scale?: number }): string => {
  const {
    title = 'Sample Title',
    subtitle = 'Independent Mercedes Service',
    description = '',
    myth = 'Common myth about Mercedes service',
    fact = 'The actual fact that busts the myth',
    difficulty = 'Easy',
    tools_needed = 'Basic tools',
    warning = 'Important warning',
    badgeText = 'MYTH BUSTER MONDAY',
    imageUrl = '',
    logoUrl = 'https://database.silberarrows.com/storage/v1/object/public/media-files/8bc3b696-bcb6-469e-9993-030fdc903ee5/9740bc7d-d555-4c9b-b0e0-d756e0b4c50d.png',
    templateType = 'A',
    car_model = '',
    titleFontSize = 72,
    imageFit = 'cover',
    imageAlignment = 'center',
    imageZoom = 100,
    imageVerticalPosition = 0,
    isPreview = false,
    scale = 1
  } = props;

  // Scale helper function for CSS values
  const s = (value: number) => Math.round(value * scale);

  // Clean title like in original template
  const cleanTitle = (car_model || title || 'Your Title Here')
    .replace(/MERCEDES[-\s]*BENZ\s*/gi, '')
    .replace(/^AMG\s*/gi, 'AMG ');

  // Escape HTML entities FIRST to prevent XSS
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // Convert <br> tags and newlines to HTML line breaks AFTER escaping
  const renderWithLineBreaks = (text: string) => {
    if (!text) return '';
    
    // First escape HTML to prevent XSS
    const escaped = escapeHtml(text);
    
    // Then replace escaped <br> patterns and newlines with actual HTML breaks
    return escaped
      .replace(/\n/g, '<br />')
      .replace(/&lt;br\s*\/?&gt;/gi, '<br />');
  };

  const escapedTitle = renderWithLineBreaks(cleanTitle);
  const escapedMyth = renderWithLineBreaks(myth);
  const escapedFact = renderWithLineBreaks(fact);
  const escapedDifficulty = renderWithLineBreaks(difficulty);
  const escapedToolsNeeded = renderWithLineBreaks(tools_needed);
  const escapedWarning = renderWithLineBreaks(warning);
  const escapedBadgeText = escapeHtml(badgeText);

  if (templateType === 'A') {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Myth Buster Monday</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
        /* Resonate Font Faces - Railway will serve these from /Fonts/ */
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Black.woff2') format('woff2');
          font-weight: 900;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Bold.woff2') format('woff2');
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Medium.woff2') format('woff2');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Light.woff2') format('woff2');
          font-weight: 300;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Regular.woff2') format('woff2');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            display: flex;
            flex-direction: column;
            width: ${s(1080)}px;
            height: ${s(1920)}px;
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
            background: #000000;
            color: #ffffff;
            overflow: hidden;
            margin: 0;
            padding: 0;
            position: relative;
            /* Ensure exact Instagram Story dimensions */
            max-width: ${s(1080)}px;
            max-height: ${s(1920)}px;
            min-width: ${s(1080)}px;
            min-height: ${s(1920)}px;
        }
        .image-section {
            position: relative;
            width: 100%;
            height: 69.5%;
            overflow: hidden;
        }
        .background-image {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: ${imageFit};
            object-position: ${imageAlignment};
            transform: scale(${imageZoom / 100}) translateY(${imageVerticalPosition}px);
            transform-origin: center center;
        }
        .content-section {
            padding: ${s(20)}px ${s(40)}px ${s(40)}px ${s(40)}px;
            height: 30.5%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: ${s(12)}px;
            overflow: visible;
        }
        .badge-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: ${s(16)}px;
            margin-top: ${s(20)}px;
        }
        .badge {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1);
            color: #000;
            padding: ${s(16)}px ${s(32)}px;
            border-radius: ${s(25)}px;
            font-weight: 500;
            font-size: ${s(24)}px;
            text-transform: uppercase;
            letter-spacing: ${s(0.8)}px;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            box-shadow: 0 ${s(6)}px ${s(20)}px rgba(255,255,255,0.1);
            border: ${s(2)}px solid rgba(255,255,255,0.2);
        }
        .logo {
            height: ${s(96)}px;
            width: auto;
            filter: brightness(1.3) drop-shadow(0 ${s(2)}px ${s(4)}px rgba(0,0,0,0.3));
            margin-top: ${s(4)}px;
            flex-shrink: 0;
        }
        .content-container {
            margin-bottom: ${s(24)}px;
        }
        .title {
            font-size: ${s(titleFontSize)}px;
            font-weight: 900;
            color: #ffffff;
            line-height: 0.95;
            text-shadow: 0 ${s(2)}px ${s(4)}px rgba(0,0,0,0.3);
            margin-bottom: ${s(12)}px;
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
            text-align: left;
            overflow: hidden;
            max-height: ${s(titleFontSize * 1.9)}px;
            word-break: break-word;
            hyphens: auto;
            text-transform: uppercase;
        }
        .arrow-indicator {
            position: absolute;
            left: ${s(40)}px;
            right: ${s(40)}px;
            bottom: ${s(120)}px;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: ${s(16)}px;
            background: rgba(255,255,255,0.15);
            border: ${s(2)}px solid rgba(255,255,255,0.3);
            padding: ${s(24)}px ${s(32)}px;
            border-radius: ${s(20)}px;
            backdrop-filter: blur(${s(20)}px);
            -webkit-backdrop-filter: blur(${s(20)}px);
            font-weight: 400;
            font-size: ${s(32)}px;
            box-shadow: 0 ${s(8)}px ${s(32)}px rgba(0,0,0,0.2);
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
        }
    </style>
</head>
<body>
    <div class="image-section">
        <img src="${imageUrl || logoUrl}" class="background-image" alt="Background" loading="eager" />
    </div>
    
    <div class="content-section">
        <div class="badge-row">
            <div class="badge">
                <svg width="${s(20)}" height="${s(20)}" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg" style="margin-right: ${s(6)}px;">
                    <path d="M10.29 3.86L1.82 18.02C1 19.39 2 21.14 3.53 21.14H20.47C22 21.14 23 19.39 22.18 18.02L13.71 3.86C12.93 2.54 11.07 2.54 10.29 3.86ZM11 8.14H13V14.14H11V8.14ZM11 16.14H13V18.14H11V16.14Z"/>
                </svg>
                ${escapedBadgeText}
            </div>
            <img src="${logoUrl}" alt="SilberArrows Logo" class="logo" />
        </div>
        
        <div class="content-container">
            <h1 class="title">${escapedTitle}</h1>
        </div>
    </div>
    
    <div class="arrow-indicator">
        <i class="fas fa-arrow-right" style="margin-right: ${s(12)}px;"></i>
        <span style="font-weight: bold;">More Details</span>
    </div>
</body>
</html>`;
  } else {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Myth Buster Monday</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
        /* Resonate Font Faces - Railway will serve these from /Fonts/ */
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Black.woff2') format('woff2');
          font-weight: 900;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Bold.woff2') format('woff2');
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Medium.woff2') format('woff2');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Light.woff2') format('woff2');
          font-weight: 300;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('/Fonts/Resonate-Regular.woff2') format('woff2');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            display: flex;
            flex-direction: column;
            width: ${s(1080)}px;
            height: ${s(1920)}px;
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
            background: #000000;
            color: #ffffff;
            overflow: hidden;
            margin: 0;
            padding: 0;
            position: relative;
            /* Ensure exact Instagram Story dimensions */
            max-width: ${s(1080)}px;
            max-height: ${s(1920)}px;
            min-width: ${s(1080)}px;
            min-height: ${s(1920)}px;
        }
        .background-section {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 69.5%;
            z-index: 0;
            overflow: hidden;
        }
        .background-image {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: ${imageAlignment};
            transform: scale(${imageZoom / 100}) translateY(${imageVerticalPosition}px);
            transform-origin: center center;
            filter: blur(${s(8)}px);
            opacity: 0.3;
        }
        .background-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5));
        }
        .content {
            position: relative;
            z-index: 1;
            padding: ${s(60)}px ${s(40)}px ${s(160)}px ${s(40)}px;
            height: 30.5%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: ${s(12)}px;
            overflow: visible;
        }
        .badge-row {
            margin-top: 0px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: ${s(16)}px;
        }
        .badge {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1);
            color: #000;
            padding: ${s(16)}px ${s(32)}px;
            border-radius: ${s(25)}px;
            font-weight: 500;
            font-size: ${s(24)}px;
            text-transform: uppercase;
            letter-spacing: ${s(0.8)}px;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            box-shadow: 0 ${s(6)}px ${s(20)}px rgba(255,255,255,0.1);
            border: ${s(2)}px solid rgba(255,255,255,0.2);
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
        }
        .logo {
            height: ${s(96)}px;
            width: auto;
            margin-top: ${s(4)}px;
            flex-shrink: 0;
            display: block;
            visibility: visible;
            opacity: 1;
            z-index: 999;
            filter: brightness(1.3) drop-shadow(0 ${s(2)}px ${s(4)}px rgba(0,0,0,0.3));
        }
        .content-container {
            margin-bottom: ${s(24)}px;
        }
        .myth-section, .fact-section {
            background: rgba(255, 255, 255, 0.1);
            border: ${s(1)}px solid rgba(255, 255, 255, 0.15);
            border-radius: ${s(16)}px;
            padding: ${s(32)}px;
            margin-bottom: ${s(24)}px;
            backdrop-filter: blur(${s(10)}px);
            -webkit-backdrop-filter: blur(${s(10)}px);
            -webkit-backdrop-filter: blur(${s(10)}px);
            box-shadow: 0 ${s(4)}px ${s(20)}px rgba(0, 0, 0, 0.15);
        }
        .section-header {
            display: flex;
            align-items: center;
            gap: ${s(12)}px;
            margin-bottom: ${s(16)}px;
        }
        .myth-title {
            font-size: ${s(41)}px;
            font-weight: 700;
            color: #ef4444;
            text-transform: uppercase;
            letter-spacing: ${s(0.5)}px;
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
        }
        .fact-title {
            font-size: ${s(41)}px;
            font-weight: 700;
            color: #22c55e;
            text-transform: uppercase;
            letter-spacing: ${s(0.5)}px;
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
        }
        .section-content {
            font-size: ${s(37)}px;
            color: #e2e8f0;
            line-height: 1.4;
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
            font-weight: 300;
        }
        .contact {
            position: absolute;
            left: ${s(40)}px;
            right: ${s(40)}px;
            bottom: ${s(120)}px;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: ${s(16)}px;
            background: rgba(255,255,255,0.15);
            border: ${s(2)}px solid rgba(255,255,255,0.3);
            padding: ${s(24)}px ${s(32)}px;
            border-radius: ${s(20)}px;
            backdrop-filter: blur(${s(20)}px);
            -webkit-backdrop-filter: blur(${s(20)}px);
            font-weight: 400;
            font-size: ${s(32)}px;
            box-shadow: 0 ${s(8)}px ${s(32)}px rgba(0,0,0,0.2);
            font-family: 'Resonate', 'Inter', 'Arial', sans-serif;
        }
    </style>
</head>
<body>
    <div class="background-section">
        <img src="${imageUrl || logoUrl}" class="background-image" alt="Background" loading="eager" />
        <div class="background-overlay"></div>
    </div>
    
    <div class="content">
        <div class="badge-row">
            <div class="badge">
                <svg width="${s(20)}" height="${s(20)}" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg" style="margin-right: ${s(6)}px;">
                    <path d="M10.29 3.86L1.82 18.02C1 19.39 2 21.14 3.53 21.14H20.47C22 21.14 23 19.39 22.18 18.02L13.71 3.86C12.93 2.54 11.07 2.54 10.29 3.86ZM11 8.14H13V14.14H11V8.14ZM11 16.14H13V18.14H11V16.14Z"/>
                </svg>
                ${escapedBadgeText}
            </div>
            <img src="${logoUrl}" alt="SilberArrows Logo" class="logo" />
        </div>
        
        <div class="content-container">
            ${myth ? `
            <div class="myth-section">
                <div class="section-header">
                    <span style="display: inline-flex; align-items: center;">
                        <svg width="${s(41)}" height="${s(41)}" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/>
                        </svg>
                    </span>
                    <span class="myth-title">The Myth</span>
                </div>
                <div class="section-content">${escapedMyth}</div>
            </div>
            ` : ''}
            
            ${fact ? `
            <div class="fact-section">
                <div class="section-header">
                    <span style="display: inline-flex; align-items: center;">
                        <svg width="${s(41)}" height="${s(41)}" viewBox="0 0 24 24" fill="#22c55e" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                    </span>
                    <span class="fact-title">The Fact</span>
                </div>
                <div class="section-content">${escapedFact}</div>
            </div>
            ` : ''}
            
            
        </div>
    </div>
    
    <div class="contact">
        <i class="fas fa-phone" style="margin-right: ${s(8)}px;"></i>
        <i class="fab fa-whatsapp" style="margin-right: ${s(8)}px;"></i>
        <span style="font-weight: bold;">Call or WhatsApp us at +971 4 380 5515</span>
    </div>
</body>
</html>`;
  }
};

interface MythBusterPreviewProps {
  title?: string;
  subtitle?: string;
  description?: string;
  myth?: string;
  fact?: string;
  difficulty?: string;
  tools_needed?: string;
  warning?: string;
  badgeText?: string;
  imageUrl?: string;
  logoUrl?: string;
  templateType?: 'A' | 'B';
  car_model?: string;
  titleFontSize?: number;
  imageFit?: string;
  imageAlignment?: string;
  imageZoom?: number;
  imageVerticalPosition?: number;
  isPreview?: boolean; // For modal preview scaling
}

export const MythBusterPreview: React.FC<MythBusterPreviewProps> = (props) => {
  const {
    title = 'Sample Title',
    subtitle = 'Independent Mercedes Service',
    description = '',
    myth = 'Common myth about Mercedes service',
    fact = 'The actual fact that busts the myth',
    difficulty = 'Easy',
    tools_needed = 'Basic tools',
    warning = 'Important warning',
    badgeText = 'MYTH BUSTER MONDAY',
    imageUrl = '',
    logoUrl = 'https://database.silberarrows.com/storage/v1/object/public/media-files/8bc3b696-bcb6-469e-9993-030fdc903ee5/9740bc7d-d555-4c9b-b0e0-d756e0b4c50d.png',
    templateType = 'A',
    car_model = '',
    titleFontSize = 72,
    imageFit = 'cover',
    imageAlignment = 'center',
    imageZoom = 100,
    imageVerticalPosition = 0,
    isPreview = false
  } = props;

  // Clean title like in original template
  const cleanTitle = (car_model || title || 'Your Title Here')
    .replace(/MERCEDES[-\s]*BENZ\s*/gi, '')
    .replace(/^AMG\s*/gi, 'AMG ');

  // Convert <br> tags and newlines to React line breaks
  const renderTitleWithLineBreaks = (text: string) => {
    if (!text) return '';
    
    // Split by newlines and <br> tags
    const lines = text.split(/\n|<br\s*\/?>/gi);
    
    return lines.map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Icon components
  const ExclamationTriangleIcon = ({ size = 20, color = '#000000' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg" style={{ marginRight: 6 }}>
      <path d="M10.29 3.86L1.82 18.02C1 19.39 2 21.14 3.53 21.14H20.47C22 21.14 23 19.39 22.18 18.02L13.71 3.86C12.93 2.54 11.07 2.54 10.29 3.86ZM11 8.14H13V14.14H11V8.14ZM11 16.14H13V18.14H11V16.14Z"/>
    </svg>
  );

  const CrossIcon = ({ size = 41, color = '#ef4444' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/>
    </svg>
  );

  const CheckIcon = ({ size = 41, color = '#22c55e' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
    </svg>
  );

  // Template A - Original design
  if (templateType === 'A') {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1080px',
        height: '1920px',
        fontFamily: 'Resonate, Inter, Arial, sans-serif',
        background: '#000000',
        color: '#ffffff',
        overflow: 'hidden',
        transform: isPreview ? 'translate(-50%, -50%) scale(0.4)' : 'scale(1)',
        transformOrigin: 'center center',
        margin: '0',
        padding: '0',
        position: isPreview ? 'absolute' : 'relative',
        top: isPreview ? '50%' : 'auto',
        left: isPreview ? '50%' : 'auto',
        maxWidth: '1080px',
        maxHeight: '1920px',
        minWidth: '1080px',
        minHeight: '1920px'
      }}>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        
        {/* Image Section */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '69.5%',
          overflow: 'hidden'
        }}>
          <img
            src={imageUrl || logoUrl}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: imageFit as any,
              objectPosition: imageAlignment,
              transform: `scale(${imageZoom / 100}) translateY(${imageVerticalPosition}px)`,
              transformOrigin: 'center center'
            }}
            alt="Background"
            loading="eager"
          />
        </div>

        {/* Content Section */}
        <div style={{
          padding: '20px 40px 40px 40px',
          height: '30.5%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          gap: '12px',
          overflow: 'visible'
        }}>
          {/* Badge Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            marginTop: '20px'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)',
              color: '#000',
              padding: '16px 32px',
              borderRadius: '25px',
              fontWeight: 500,
              fontSize: '24px',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 6px 20px rgba(255,255,255,0.1)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}>
              <ExclamationTriangleIcon size={20} color="#000" /> {badgeText}
            </div>
            <img
              src={logoUrl}
              alt="SilberArrows Logo"
              style={{
                height: '96px',
                width: 'auto',
                filter: 'brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                marginTop: '4px',
                flexShrink: 0
              }}
            />
          </div>

          {/* Content Container */}
          <div style={{
            marginBottom: '24px'
          }}>
            <h1 style={{
              fontSize: `${titleFontSize}px`,
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: '0.95',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              marginBottom: '12px',
              fontFamily: 'Resonate, Inter, sans-serif',
              textAlign: 'left',
              overflow: 'hidden',
              maxHeight: `${titleFontSize * 1.9}px`,
              wordBreak: 'break-word',
              hyphens: 'auto',
              textTransform: 'uppercase'
            }}>
              {renderTitleWithLineBreaks(cleanTitle)}
            </h1>
          </div>
        </div>

        {/* Arrow indicator */}
        <div style={{
          position: 'fixed',
          left: '40px',
          right: '40px',
          bottom: '120px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          padding: '24px 32px',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          fontWeight: 400,
          fontSize: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          fontFamily: 'Resonate, Inter, Arial, sans-serif'
        }}>
          <i className="fas fa-arrow-right" style={{ marginRight: '12px' }}></i>
          <span style={{ fontWeight: 'bold' }}>More Details</span>
        </div>
      </div>
    );
  }

  // Template B - With myth and fact sections
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '1080px',
      height: '1920px',
      fontFamily: 'Resonate, Inter, Arial, sans-serif',
      background: '#000000',
      color: '#ffffff',
      overflow: 'hidden',
      transform: isPreview ? 'translate(-50%, -50%) scale(0.4)' : 'scale(1)',
      transformOrigin: 'center center',
      margin: '0',
      padding: '0',
      position: isPreview ? 'absolute' : 'relative',
      top: isPreview ? '50%' : 'auto',
      left: isPreview ? '50%' : 'auto',
      maxWidth: '1080px',
      maxHeight: '1920px',
      minWidth: '1080px',
      minHeight: '1920px'
    }}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      
      {/* Background image with blur overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '69.5%',
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <img
          src={imageUrl || logoUrl}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: imageAlignment,
            transform: `scale(${imageZoom / 100}) translateY(${imageVerticalPosition}px)`,
            transformOrigin: 'center center',
            filter: 'blur(8px)',
            opacity: 0.3
          }}
          alt="Background"
          loading="eager"
        />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5))'
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '60px 40px 160px 40px',
        height: '30.5%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: '12px',
        overflow: 'visible'
      }}>
        {/* Badge Row */}
        <div style={{
          marginTop: '0px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)',
            color: '#000',
            padding: '16px 32px',
            borderRadius: '25px',
            fontWeight: 500,
            fontSize: '24px',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            boxShadow: '0 6px 20px rgba(255,255,255,0.1)',
            border: '2px solid rgba(255,255,255,0.2)',
            fontFamily: 'Resonate, Inter, sans-serif'
          }}>
            <ExclamationTriangleIcon size={20} color="#000" /> {badgeText}
          </div>
          <img
            src={logoUrl}
            alt="SilberArrows Logo"
            style={{
              height: '96px',
              width: 'auto',
              marginTop: '4px',
              flexShrink: 0,
              display: 'block',
              visibility: 'visible',
              opacity: 1,
              zIndex: 999,
              filter: 'brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}
          />
        </div>

        {/* Content Container */}
        <div style={{ marginBottom: '24px' }}>

          {/* Myth Section */}
          {myth && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <CrossIcon size={41} color="#ef4444" />
                </span>
                <span style={{
                  fontSize: '41px',
                  fontWeight: 700,
                  color: '#ef4444',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>
                  The Myth
                </span>
              </div>
              <div style={{
                fontSize: '37px',
                color: '#e2e8f0',
                lineHeight: '1.4',
                fontFamily: 'Resonate, Inter, sans-serif',
                fontWeight: 300
              }}>
                {renderTitleWithLineBreaks(myth)}
              </div>
            </div>
          )}

          {/* Fact Section */}
          {fact && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              padding: '32px',
              marginBottom: '24px',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <CheckIcon size={41} color="#22c55e" />
                </span>
                <span style={{
                  fontSize: '41px',
                  fontWeight: 700,
                  color: '#22c55e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontFamily: 'Resonate, Inter, sans-serif'
                }}>
                  The Fact
                </span>
              </div>
              <div style={{
                fontSize: '37px',
                color: '#e2e8f0',
                lineHeight: '1.4',
                fontFamily: 'Resonate, Inter, sans-serif',
                fontWeight: 300
              }}>
                {renderTitleWithLineBreaks(fact)}
              </div>
            </div>
          )}


        </div>

        {/* Contact */}
        <div style={{
          position: 'fixed',
          left: '40px',
          right: '40px',
          bottom: '120px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          background: 'rgba(255,255,255,0.15)',
          border: '2px solid rgba(255,255,255,0.3)',
          padding: '24px 32px',
          borderRadius: '20px',
          backdropFilter: 'blur(20px)',
          fontWeight: 400,
          fontSize: '32px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          fontFamily: 'Resonate, Inter, Arial, sans-serif'
        }}>
          <i className="fas fa-phone" style={{ marginRight: '8px' }}></i>
          <i className="fab fa-whatsapp" style={{ marginRight: '8px' }}></i>
          <span style={{ fontWeight: 'bold' }}>Call or WhatsApp us at +971 4 380 5515</span>
        </div>
      </div>
    </div>
  );
};