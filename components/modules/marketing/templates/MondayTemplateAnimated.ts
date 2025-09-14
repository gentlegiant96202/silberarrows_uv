import type { ContentPillarFormData } from '../types';

export const generateMondayTemplate = (
  formData: ContentPillarFormData,
  renderImageUrl: string,
  absoluteLogoUrl: string,
  fontFaceCSS: string,
  templateType: 'A' | 'B' = 'A'
): string => {
  if (templateType === 'A') {
    // ANIMATED Monday Template A for Instagram Stories
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style>
${fontFaceCSS}
        </style>
      </head>
      <body>
      <style>
        /* Instagram Story Animations */
        @keyframes slideInFromTop {
          0% { transform: translateY(-50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideInFromBottom {
          0% { transform: translateY(50px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes slideInFromLeft {
          0% { transform: translateX(-50px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideInFromRight {
          0% { transform: translateX(50px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes fadeInScale {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes imageZoom {
          0% { transform: translateZ(0) scale(${((formData.imageZoom || 100) + 8) / 100}) translateY(${formData.imageVerticalPosition || 0}px); }
          100% { transform: translateZ(0) scale(${(formData.imageZoom || 100) / 100}) translateY(${formData.imageVerticalPosition || 0}px); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes textReveal {
          0% { clip-path: inset(0 100% 0 0); }
          100% { clip-path: inset(0 0 0 0); }
        }

        @keyframes mythFactSlide {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { font-family: 'Resonate', 'Inter', sans-serif; background: #000000; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
        .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
        .image-section { position: relative; width: 100%; height: 69.5%; overflow: hidden; }
        .background-image { 
          width: 100%; 
          height: 100%; 
          object-fit: ${formData.imageFit || 'cover'}; 
          object-position: ${formData.imageAlignment || 'center'}; 
          image-rendering: auto;
          image-rendering: high-quality;
          image-rendering: -webkit-optimize-contrast;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          transform: translateZ(0) scale(${(formData.imageZoom || 100) / 100}) translateY(${formData.imageVerticalPosition || 0}px);
          animation: imageZoom 7s ease-out forwards;
        }
        .badge-row { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          margin-bottom: 16px; 
          margin-top: 20px;
        }
        .badge { 
          background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); 
          color: #000; 
          padding: 16px 32px; 
          border-radius: 25px; 
          font-weight: 900; 
          font-size: 24px; 
          text-transform: uppercase; 
          letter-spacing: 0.8px; 
          white-space: nowrap; 
          display: inline-flex; 
          align-items: center; 
          box-shadow: 0 6px 20px rgba(255,255,255,0.1); 
          border: 2px solid rgba(255,255,255,0.2);
          animation: slideInFromTop 1s ease-out 0.3s both;
        }
        .content { 
          padding: 20px 40px 40px 40px; 
          height: 30.5%; 
          display: flex; 
          flex-direction: column; 
          justify-content: flex-start; 
          gap: 12px; 
          overflow: visible; 
        }
        .title { 
          font-size: ${formData.titleFontSize || 72}px; 
          font-weight: 900; 
          color: #ffffff; 
          line-height: 1.2; 
          text-shadow: 0 2px 4px rgba(0,0,0,0.3); 
          margin-bottom: 12px;
          animation: slideInFromLeft 1s ease-out 0.8s both;
        }
        .subtitle { 
          font-size: 42px; 
          color: #f1f5f9; 
          margin-bottom: 16px; 
          font-weight: 600; 
          text-shadow: 0 2px 4px rgba(0,0,0,0.2);
          animation: slideInFromRight 1s ease-out 1.0s both;
        }
        .description { 
          font-size: 32px; 
          color: #f1f5f9; 
          line-height: 2.5; 
          text-align: left; 
          margin: 16px 0; 
          max-width: 96%; 
          text-shadow: 0 1px 2px rgba(0,0,0,0.2); 
          font-weight: 500;
          animation: fadeInScale 1s ease-out 1.2s both;
        }
        .company-logo-inline { 
          height: 96px; 
          width: auto; 
          filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); 
          margin-top: 4px; 
          flex-shrink: 0;
          animation: slideInFromRight 1s ease-out 0.5s both;
        }
        
        .content-container {
          margin-bottom: 24px;
        }
        
        .arrow-indicator {
          position: fixed;
          left: 40px;
          right: 40px;
          bottom: 120px;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          background: rgba(255,255,255,0.15);
          border: 2px solid rgba(255,255,255,0.3);
          padding: 24px 32px;
          border-radius: 20px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          font-weight: 800;
          font-size: 32px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          animation: pulse 2s ease-in-out 3s infinite;
        }
        
        .arrow-indicator i {
          color: #ffffff;
          font-size: 26px;
        }
        
        .arrow-text {
          color: #ffffff;
          font-weight: 800;
          font-size: 32px;
        }
        
        /* Myth vs Fact specific animations */
        .myth-fact-container {
          animation: slideInFromBottom 1s ease-out 1.5s both;
        }
        
        .myth-section {
          animation: mythFactSlide 0.8s ease-out 2.0s both;
        }
        
        .fact-section {
          animation: mythFactSlide 0.8s ease-out 2.3s both;
        }
        
        /* Update ALL font families for Resonate - but preserve icons */
        *:not(i):not(.fas):not(.far):not(.fab):not(.fal) { font-family: 'Resonate', 'Inter', sans-serif !important; }
        i.fas, i.far, i.fab, i.fal { font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important; font-weight: 900 !important; font-style: normal !important; }
        .badge i { font-family: "Font Awesome 6 Free" !important; font-weight: 900 !important; }
        .section-header i { font-family: "Font Awesome 6 Free" !important; font-weight: 900 !important; }
        body { font-family: 'Resonate', 'Inter', sans-serif !important; }
        .badge { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 500 !important; }
        .title { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 900 !important; }
        .subtitle { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 500 !important; }
        .description { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 300 !important; }
        .arrow-indicator { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 700 !important; }
        .arrow-text { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 700 !important; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Resonate', 'Inter', sans-serif !important; }
        p, span, div { font-family: 'Resonate', 'Inter', sans-serif !important; }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 16px;
          font-size: 40px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .section-header.myth {
          color: #ef4444;
        }
        
        .section-header.fact {
          color: #22c55e;
        }
        
        .section-content {
          font-size: 32px;
          line-height: 1.6;
          color: #f1f5f9;
          margin-bottom: 32px;
          text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        }
        
        .myth-fact-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
          margin-top: 16px;
        }
        
        .myth-section, .fact-section {
          padding: 24px;
          border-radius: 16px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.1);
        }
        
        .myth-section {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.1));
          border-color: rgba(239, 68, 68, 0.3);
        }
        
        .fact-section {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(21, 128, 61, 0.1));
          border-color: rgba(34, 197, 94, 0.3);
        }
      </style>
      
      <div class="content-card">
        <!-- Image Section -->
        <div class="image-section">
          <img src="${renderImageUrl}" alt="Background" class="background-image" />
        </div>
        
        <!-- Content Section -->
        <div class="content">
          <div class="badge-row">
            <div class="badge">
              <i class="fas fa-calendar-alt" style="margin-right: 12px;"></i>
              ${formData.badgeText || 'MONDAY'}
            </div>
            <img src="${absoluteLogoUrl}" alt="Company Logo" class="company-logo-inline" />
          </div>
          
          <h1 class="title">${formData.title}</h1>
          
          ${formData.subtitle ? `<h2 class="subtitle">${formData.subtitle}</h2>` : ''}
          
          <div class="myth-fact-container">
            ${formData.myth ? `
              <div class="myth-section">
                <div class="section-header myth">
                  <i class="fas fa-times-circle"></i>
                  MYTH
                </div>
                <div class="section-content">${formData.myth}</div>
              </div>
            ` : ''}
            
            ${formData.fact ? `
              <div class="fact-section">
                <div class="section-header fact">
                  <i class="fas fa-check-circle"></i>
                  FACT
                </div>
                <div class="section-content">${formData.fact}</div>
              </div>
            ` : ''}
          </div>
          
          ${formData.description ? `<p class="description">${formData.description}</p>` : ''}
          
          <div class="arrow-indicator">
            <i class="fas fa-chevron-up"></i>
            <span class="arrow-text">SWIPE UP</span>
          </div>
        </div>
      </div>
      
      </body>
      </html>
    `;
  }

  // Template B (if needed)
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
      <style>
${fontFaceCSS}
      </style>
    </head>
    <body style="font-family: 'Resonate', 'Inter', sans-serif; background: #000; color: #fff; margin: 0; padding: 40px; width: 1080px; height: 1920px; box-sizing: border-box;">
      <div style="text-align: center; padding-top: 50%;">
        <h1 style="font-size: 64px; margin-bottom: 32px;">${formData.title}</h1>
        <p style="font-size: 32px; opacity: 0.8;">Template B - Coming Soon</p>
      </div>
    </body>
    </html>
  `;
};
