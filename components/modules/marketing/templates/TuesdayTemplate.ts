import type { ContentPillarFormData } from '../types';

export const generateTuesdayTemplate = (
  formData: ContentPillarFormData,
  renderImageUrl: string,
  absoluteLogoUrl: string,
  fontFaceCSS: string,
  templateType: 'A' | 'B' = 'A'
): string => {
  if (templateType === 'A') {
    // EXACT copy of original Tuesday Template A from ContentPillarModal.tsx line 814-1008
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
      <style>
        /* Instagram Story Animations */
        @keyframes slideInFromTop {
          0% { transform: translateY(-50px); opacity: 0; }
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
        
        @keyframes techSlide {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { font-family: 'Resonate', 'Inter', sans-serif; background: #000000; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
        .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
        .image-section { position: relative; width: 100%; height: 69.5%; }
        .background-image { width: 100%; height: 100%; object-fit: ${formData.imageFit || 'cover'}; object-position: ${formData.imageAlignment || 'center'}; }
        .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; margin-top: 20px; }
        .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); animation: slideInFromTop 1s ease-out 0.3s both; }
        .content { padding: 20px 40px 40px 40px; height: 30.5%; display: flex; flex-direction: column; justify-content: flex-start; gap: 12px; overflow: visible; }
        .title { font-size: ${formData.titleFontSize || 72}px; font-weight: 900; color: #ffffff; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-bottom: 12px; }
        .subtitle { font-size: 42px; color: #f1f5f9; margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .description { font-size: 32px; color: #f1f5f9; line-height: 2.5; text-align: left; margin: 16px 0; max-width: 96%; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: 500; }
        .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; animation: slideInFromRight 1s ease-out 0.5s both; }
        
        .tech-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 20px; 
          margin: 24px 0; 
        }
        
        .tech-section {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 32px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .section-header i {
          font-size: 41px;
          color: #e2e8f0;
          background: linear-gradient(135deg, #f8fafc, #cbd5e1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .section-title {
          font-size: 41px;
          font-weight: 700;
          color: #f1f5f9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .section-content {
          font-size: 37px;
          color: #e2e8f0;
          line-height: 1.4;
        }
        
        .info-card {
          text-align: center;
          padding: 12px;
          animation: fadeInScale 0.8s ease-out 2.1s both;
        }
        
        .info-icon {
          font-size: 37px;
          margin-bottom: 8px;
          color: #cbd5e1;
        }
        
        .info-label {
          font-size: 23px;
          color: #cbd5e1;
          margin-bottom: 6px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-value {
          font-size: 32px;
          color: #f8fafc;
          font-weight: 700;
        }
        
        .warning-section {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 150, 150, 0.3);
          border-radius: 16px;
          padding: 32px;
          margin: 24px 0;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: fadeInScale 0.8s ease-out 2.4s both;
        }
        
        .warning-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .warning-header i {
          font-size: 32px;
          color: #ff6b6b;
        }
        
        .warning-title {
          font-size: 32px;
          font-weight: 700;
          color: #ff6b6b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .warning-content {
          font-size: 32px;
          color: #ffebeb;
          line-height: 1.4;
        }
        
        .content-container {
          margin-bottom: 24px;
          animation: fadeInScale 1s ease-out 1.2s both;
        }
        
        .tech-section {
          animation: techSlide 0.8s ease-out 1.5s both;
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
      </style>

      <div class="content-card">
        <div class="image-section">
          <img src="${renderImageUrl}" class="background-image" referrerpolicy="no-referrer" />
        </div>
        
        <div class="content">
          <div class="badge-row">
            <div class="badge"><i class="fas fa-lightbulb" style="margin-right:6px;"></i> ${formData.badgeText || 'TECH TIPS TUESDAY'}</div>
            <img src="${absoluteLogoUrl}" alt="SilberArrows Logo" class="company-logo-inline" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/MAIN LOGO.png';" />
          </div>
          
                      <div class="content-container">
            <div>
          <h1 class="title">${formData.title || 'Your Title Here'}</h1>
            </div>
          </div>
        </div>
            
        <!-- Arrow indicator positioned like contact box -->
        <div class="arrow-indicator">
          <i class="fas fa-arrow-right"></i>
          <span class="arrow-text">More Details</span>
        </div>
      </div>
      </body>
      </html>`;
  } else {
    // EXACT copy of original Tuesday Template B from ContentPillarModal.tsx line 1360-1577
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      </head>
      <body>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { font-family: 'Resonate', 'Inter', sans-serif; background: #000000; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
        .content-card { 
          display: flex; 
          flex-direction: column; 
          width: 100%; 
          height: 100vh; 
        }
        .content {
          padding: 20px 40px 40px 40px; 
          height: 100%; 
          display: flex; 
          flex-direction: column; 
          justify-content: flex-start; 
          gap: 12px; 
          overflow: visible;
        }
        .image-section { position: relative; width: 100%; height: 69.5%; }
        .background-image { width: 100%; height: 100%; object-fit: ${formData.imageFit || 'cover'}; object-position: ${formData.imageAlignment || 'center'}; }
        .badge-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; margin-top: 20px; }
        .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); animation: slideInFromTop 1s ease-out 0.3s both; }
        .content { padding: 20px 40px 40px 40px; height: 30.5%; display: flex; flex-direction: column; justify-content: flex-start; gap: 12px; overflow: visible; }
        .title { font-size: ${formData.titleFontSize || 72}px; font-weight: 900; color: #ffffff; line-height: 1.2; text-shadow: 0 2px 4px rgba(0,0,0,0.3); margin-bottom: 12px; }
        .subtitle { font-size: 42px; color: #f1f5f9; margin-bottom: 16px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        .description { font-size: 32px; color: #f1f5f9; line-height: 2.5; text-align: left; margin: 16px 0; max-width: 96%; text-shadow: 0 1px 2px rgba(0,0,0,0.2); font-weight: 500; }
        .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; animation: slideInFromRight 1s ease-out 0.5s both; }
        .contact { position: fixed; left: 40px; right: 40px; bottom: 120px; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 16px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); padding: 24px 32px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
        .contact i { color: #ffffff; font-size: 26px; }
        
        /* Tech sections styling */
        .tech-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 24px; 
          margin: 24px 0; 
        }
        
        .tech-section {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 24px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .section-header i {
          font-size: 41px;
          color: #e2e8f0;
          background: linear-gradient(135deg, #f8fafc, #cbd5e1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .section-title {
          font-size: 41px;
          font-weight: 700;
          color: #f1f5f9;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .section-content {
          font-size: 37px;
          color: #e2e8f0;
          line-height: 1.4;
        }
        
        .info-card {
          text-align: center;
          padding: 12px;
          animation: fadeInScale 0.8s ease-out 2.1s both;
        }
        
        .info-icon {
          font-size: 37px;
          margin-bottom: 8px;
          color: #cbd5e1;
        }
        
        .info-label {
          font-size: 23px;
          color: #cbd5e1;
          margin-bottom: 6px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .info-value {
          font-size: 32px;
          color: #f8fafc;
          font-weight: 700;
        }
        
        .warning-section {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 150, 150, 0.3);
          border-radius: 16px;
          padding: 32px;
          margin: 24px 0;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          animation: fadeInScale 0.8s ease-out 2.4s both;
        }
        
        .warning-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        
        .warning-header i {
          font-size: 32px;
          color: #ff6b6b;
        }
        
        .warning-title {
          font-size: 32px;
          font-weight: 700;
          color: #ff6b6b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .warning-content {
          font-size: 32px;
          color: #ffebeb;
          line-height: 1.4;
        }
        
        .content-container {
          margin-bottom: 24px;
          animation: fadeInScale 1s ease-out 1.2s both;
        }
        
        .problem-section {
          animation: techSlide 0.8s ease-out 1.5s both;
        }
        
        .solution-section {
          animation: techSlide 0.8s ease-out 1.8s both;
        }
        
        .info-card {
          animation: fadeInScale 0.8s ease-out 2.1s both;
        }
        
        .warning-section {
          animation: fadeInScale 0.8s ease-out 2.4s both;
        }
        
        .contact { position: fixed; left: 40px; right: 40px; bottom: 120px; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 16px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.3); padding: 24px 32px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
        .contact i { color: #ffffff; font-size: 26px; }
      </style>

      <div class="content-card">
        <div class="content">
          <div class="badge-row">
            <div class="badge"><i class="fas fa-lightbulb" style="margin-right:6px;"></i> ${formData.badgeText || 'TECH TIPS TUESDAY'}</div>
            <img src="${absoluteLogoUrl}" alt="SilberArrows Logo" class="company-logo-inline" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='/MAIN LOGO.png';" />
          </div>
          
          <div class="content-container">
            ${formData.problem ? `
            <div class="tech-section problem-section">
              <div class="section-header">
                <i class="fas fa-exclamation-circle"></i>
                <span class="section-title" style="color: #ff6b6b !important;">The Problem</span>
          </div>
              <div class="section-content">${formData.problem}</div>
            </div>
            ` : ''}

            ${formData.solution ? `
            <div class="tech-section solution-section">
              <div class="section-header">
                <i class="fas fa-tools"></i>
                <span class="section-title" style="color: #4ade80 !important;">The Solution</span>
            </div>
              <div class="section-content">${formData.solution}</div>
          </div>
            ` : ''}

            ${formData.difficulty && formData.tools_needed ? `
            <div class="tech-grid">
              <div class="tech-section info-card">
                <div class="info-icon"><i class="fas fa-gauge-high"></i></div>
                <div class="info-label">Difficulty</div>
                <div class="info-value">${formData.difficulty}</div>
        </div>
              
              <div class="tech-section info-card">
                <div class="info-icon"><i class="fas fa-clock"></i></div>
                <div class="info-label">Tools Needed</div>
                <div class="info-value">${formData.tools_needed}</div>
              </div>
            </div>
            ` : ''}

            ${formData.warning ? `
            <div class="warning-section">
              <div class="warning-header">
                <i class="fas fa-exclamation-triangle"></i>
                <span class="warning-title">Important Warning</span>
              </div>
              <div class="warning-content">${formData.warning}</div>
            </div>
            ` : ''}
          </div>
          
          <div class="contact"><i class="fas fa-phone"></i> <i class="fab fa-whatsapp"></i> Call or WhatsApp us at +971 4 380 5515</div>
        </div>
      </div>
      </body>
      </html>`;
  }
};