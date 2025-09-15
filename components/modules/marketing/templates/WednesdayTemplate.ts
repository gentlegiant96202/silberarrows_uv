import type { ContentPillarFormData } from '../types';

export const generateWednesdayTemplate = (
  formData: ContentPillarFormData,
  renderImageUrl: string,
  absoluteLogoUrl: string,
  fontFaceCSS: string,
  templateType: 'A' | 'B' = 'A'
): string => {
  if (templateType === 'A') {
    // EXACT copy of original Wednesday Template A from ContentPillarModal.tsx line 1159-1353
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
        
        @keyframes carSlide {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { font-family: 'Resonate', 'Inter', sans-serif; background: #D5D5D5; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
        .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
        .image-section { position: relative; width: 100%; height: 100%; overflow: hidden; }
        .background-image { width: 100%; height: 100%; object-fit: ${formData.imageFit || 'cover'}; object-position: ${formData.imageAlignment || 'center'}; transform: scale(${(formData.imageZoom || 100) / 100}) translateY(${formData.imageVerticalPosition || 0}px); }
        .badge-row { display: flex; align-items: center; justify-content: center; margin-bottom: 24px; gap: 20px; }
        .badge { background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1); color: #000; padding: 16px 32px; border-radius: 25px; font-weight: 900; font-size: 24px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); animation: slideInFromTop 1s ease-out 0.3s both; }
        .content { padding: 40px; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; overflow: visible; position: absolute; top: 2%; left: 0; right: 0; z-index: 10; text-align: center; }
        .title { font-size: ${formData.titleFontSize || 72}px; font-weight: 900; color: #555555; line-height: 0.8; text-shadow: 1px 1px 2px rgba(0,0,0,0.3); margin-bottom: 2px; font-style: normal; padding: 0 80px; animation: slideInFromLeft 1s ease-out 0.8s both; }
        .subtitle { font-size: 45px; color: #555555; margin-bottom: 8px; font-weight: 700; text-shadow: none; font-style: normal; }
        .company-logo-inline { height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); margin-top: 4px; flex-shrink: 0; animation: slideInFromRight 1s ease-out 0.5s both; }
        .button-row { position: fixed; left: 40px; right: 40px; bottom: 20px; z-index: 5; display: flex; gap: 16px; animation: fadeInScale 1s ease-out 1.5s both; }
        .contact { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12px; background: rgba(0,0,0,0.15); border: 2px solid rgba(0,0,0,0.3); padding: 20px 24px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); color: #555555; }
        .contact i { color: #555555; font-size: 22px; }
        .more-details { flex: 1; display: flex; align-items: center; justify-content: center; gap: 12px; background: rgba(0,0,0,0.15); border: 2px solid rgba(0,0,0,0.3); padding: 20px 24px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); color: #555555; }
        .more-details i { color: #555555; font-size: 22px; }
        
        /* Update ALL font families for Resonate - but preserve icons */
        *:not(i):not(.fas):not(.far):not(.fab):not(.fal) { font-family: 'Resonate', 'Inter', sans-serif !important; }
        i.fas, i.far, i.fab, i.fal { font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important; font-weight: 900 !important; font-style: normal !important; }
        .badge i { font-family: "Font Awesome 6 Free" !important; font-weight: 900 !important; }
        .badge { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 500 !important; }
        .title { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 900 !important; }
        .subtitle { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 500 !important; }
        .contact { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 700 !important; }
        .more-details { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 700 !important; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Resonate', 'Inter', sans-serif !important; }
        p, span, div { font-family: 'Resonate', 'Inter', sans-serif !important; }
        
        /* Car spotlight specific styles */
        .car-specs-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 16px; 
          margin: 16px 0; 
        }
        
        .spec-card {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          text-align: center;
          animation: carSlide 0.8s ease-out 1.2s both;
        }
        
        .spec-icon {
          font-size: 32px;
          margin-bottom: 12px;
          color: #e2e8f0;
          background: linear-gradient(135deg, #f8fafc, #cbd5e1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .spec-label {
          font-size: 20px;
          color: #333333;
          margin-bottom: 6px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .spec-value {
          font-size: 28px;
          color: #555555;
          font-weight: 700;
        }
        
        .car-price {
          text-align: center;
          background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.15));
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 16px;
          padding: 24px;
          margin: 20px 0;
        }
        
        .price-label {
          font-size: 24px;
          color: #ffd700;
          margin-bottom: 6px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .price-value {
          font-size: 46px;
          color: #ffd700;
          font-weight: 900;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .spotlight-badge {
          position: absolute;
          top: 100px;
          right: 30px;
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          color: #000;
          padding: 16px 32px;
          border-radius: 25px;
          font-family: 'Resonate', 'Inter', sans-serif;
          font-weight: 300;
          font-size: 28px;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.3);
          z-index: 10;
        }
        
        .arrow-indicator { 
          position: fixed; 
          left: 32px; 
          right: 32px; 
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
          font-size: 32px; 
        }
        .arrow-text { 
          color: #ffffff; 
        }
        
        /* FORCE ALL font families to Resonate - but preserve icons */
        * { font-family: 'Resonate', 'Inter', sans-serif !important; }
        i, .fas, .far, .fab, .fal { font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important; font-weight: 900 !important; font-style: normal !important; }
        .badge i { font-family: "Font Awesome 6 Free" !important; font-weight: 900 !important; }
        .spotlight-badge { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 300 !important; }
        .spotlight-badge i { font-family: "Font Awesome 6 Free" !important; font-weight: 900 !important; }
        .title { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 900 !important; font-style: normal !important; }
        .subtitle { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 700 !important; font-style: normal !important; }
        .contact { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 700 !important; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 900 !important; font-style: normal !important; }
        p, span, div { font-family: 'Resonate', 'Inter', sans-serif !important; }
      </style>

      <div class="content-card">
        <div class="image-section">
          <img src="${renderImageUrl}" class="background-image" referrerpolicy="no-referrer" />
          <div class="spotlight-badge"><i class="fas fa-star" style="margin-right:8px;"></i> ${formData.badgeText || 'CAR OF THE DAY'}</div>
        </div>
        
        <div class="content">
          <div>
            <h1 class="title">${(() => {
              const title = (formData.title || formData.car_model || '').replace(/MERCEDES[-\s]*BENZ\s*/gi, '').replace(/^AMG\s*/gi, 'AMG ');
              return title;
            })()}</h1>
            <div class="subtitle">${(() => {
              const monthlyPayment = formData.monthly_20_down_aed;
              if (monthlyPayment && monthlyPayment > 0) {
                return `<svg height="0.7em" viewBox="0 0 344.84 299.91" style="display: inline-block; vertical-align: baseline; margin-right: 6px; margin-bottom: -0.02em;" xmlns="http://www.w3.org/2000/svg"><path fill="#555555" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg><span style="font-family: 'Inter', sans-serif; font-weight: 900; color: #555555;">${monthlyPayment.toLocaleString()}</span><span style="font-family: 'Inter', sans-serif; font-weight: 300; color: #555555;"> PER MONTH</span>`;
              } else {
                return '<span style="font-family: \'Resonate\', \'Inter\', sans-serif; font-weight: 300; color: #555555;">CASH PAYMENT</span>';
              }
            })()}</div>
          </div>
        </div>
      </div>
      </body>
      </html>`;
  } else {
    // EXACT copy of original Wednesday Template B from ContentPillarModal.tsx line 1580-2055
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
        * { margin: 0; padding: 0; box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        body { font-family: 'Resonate', 'Inter', sans-serif; background: #D5D5D5; color: #ffffff; height: 100vh; overflow: hidden; margin: 0; padding: 0; width: 1080px; }
        .content-card { display: flex; flex-direction: column; width: 100%; height: 100vh; }
        .content { padding: 32px; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; gap: 20px; overflow: visible; position: relative; z-index: 2; }
        .badge { position: absolute; top: 100px; left: 30px; background: linear-gradient(135deg, #ffd700, #ff8c00); color: #000; padding: 16px 32px; border-radius: 25px; font-family: 'Resonate', 'Inter', sans-serif; font-weight: 300; font-size: 28px; text-transform: uppercase; letter-spacing: 0.8px; white-space: nowrap; display: inline-flex; align-items: center; box-shadow: 0 6px 20px rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); animation: slideInFromTop 1s ease-out 0.3s both; }
        .company-logo-inline { position: absolute; top: 100px; right: 30px; height: 96px; width: auto; filter: brightness(1.3) drop-shadow(0 2px 4px rgba(0,0,0,0.3)); flex-shrink: 0; animation: slideInFromRight 1s ease-out 0.5s both; }
        .content-container { margin-top: 200px; }
        .title-section { margin-bottom: 10px; }
        .title { font-size: 41px; font-weight: 900; color: #555555; line-height: 1.1; text-shadow: none; margin-bottom: 12px; }
        .subtitle { font-size: 32px; color: #333333; margin-bottom: 16px; font-weight: 600; text-shadow: none; }
        .contact { position: fixed; left: 32px; right: 32px; bottom: 20px; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 16px; background: rgba(0,0,0,0.15); border: 2px solid rgba(0,0,0,0.3); padding: 24px 32px; border-radius: 20px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); font-weight: 800; font-size: 32px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); color: #555555; }
        .contact i { color: #555555; font-size: 32px; }
        
        /* Car spotlight specific styles for Template B */
        .car-specs-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          grid-template-rows: repeat(3, 1fr);
          gap: 12px; 
          margin: 12px 0; 
        }
        
        .detail-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        
        .detail-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          min-height: 40px;
        }
        
        .detail-header i {
          font-size: 28px;
          color: #555555;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .detail-title {
          font-size: 28px;
          font-weight: 700;
          color: #555555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .detail-content {
          font-size: 26px;
          color: #333333;
          line-height: 1.4;
          margin-left: 44px;
        }
        
        .car-features {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          margin: 12px 0;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        
        .features-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          min-height: 40px;
        }
        
        .features-header i {
          font-size: 28px;
          color: #555555;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .features-title {
          font-size: 28px;
          font-weight: 700;
          color: #555555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .features-list {
          font-size: 26px;
          color: #333333;
          line-height: 1.4;
          margin-left: 44px;
        }
        
        .features-list li {
          margin-bottom: 12px;
        }
        
        .car-pricing {
          text-align: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          margin: 12px 0;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        
        .pricing-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 16px;
          min-height: 40px;
        }
        
        .pricing-header i {
          font-size: 28px;
          color: #555555;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .pricing-title {
          font-size: 28px;
          color: #555555;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .pricing-value {
          font-size: 46px;
          color: #555555;
          font-weight: 900;
          text-shadow: none;
        }
        
        .financing-info {
          font-size: 24px;
          color: #333333;
          margin-top: 12px;
          opacity: 0.8;
        }
        
        .spotlight-badge {
          position: absolute;
          top: 60px;
          right: 30px;
          background: linear-gradient(135deg, #ffd700, #ff8c00);
          color: #000;
          padding: 16px 32px;
          border-radius: 25px;
          font-family: 'Resonate', 'Inter', sans-serif;
          font-weight: 300;
          font-size: 28px;
          text-transform: uppercase;
          letter-spacing: 1px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.3);
          border: 2px solid rgba(255,255,255,0.3);
          z-index: 10;
        }
        
        /* Monthly Payment Cards */
        .monthly-payments-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 12px 0 16px 0;
        }
        
        .monthly-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          text-align: center;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }
        
        .monthly-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
          min-height: 32px;
        }
        
        .monthly-header i {
          font-size: 20px;
          color: #555555;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        
        .monthly-title {
          font-size: 18px;
          font-weight: 700;
          color: #555555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .monthly-amount {
          font-size: 46px;
          color: #555555;
          font-weight: 900;
          margin-bottom: 4px;
        }
        
        .monthly-period {
          font-size: 16px;
          color: #333333;
          font-weight: 300;
          text-transform: lowercase;
        }
        
        .cash-only {
          font-size: 16px;
          color: #555555;
          font-weight: 500;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .arrows-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .arrows-logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.3;
          transform: scale(1.1);
          filter: brightness(1.3) contrast(0.8);
        }
        
        /* Font overrides */
        *:not(i):not(.fas):not(.far):not(.fab):not(.fal) { font-family: 'Resonate', 'Inter', sans-serif !important; }
        i.fas, i.far, i.fab, i.fal { font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important; font-weight: 900 !important; font-style: normal !important; }
        .badge i { font-family: "Font Awesome 6 Free" !important; font-weight: 900 !important; }
        .badge { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 500 !important; }
        .title { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 900 !important; }
        .subtitle { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 500 !important; }
        .contact { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 700 !important; }
        .more-details { font-family: 'Resonate', 'Inter', sans-serif !important; font-weight: 700 !important; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Resonate', 'Inter', sans-serif !important; }
        p, span, div { font-family: 'Resonate', 'Inter', sans-serif !important; }
      </style>

      <div class="content-card">
        <!-- SilberArrows Logo Background -->
        <div class="arrows-background">
          <img src="${absoluteLogoUrl}" alt="SilberArrows" class="arrows-logo" />
        </div>
        <div class="content">
          <!-- Badge positioned like Template A -->
          <div class="badge">
            <i class="fas fa-star" style="margin-right:8px;"></i> ${formData.badgeText || 'CAR OF THE DAY'}
          </div>
          <!-- Logo positioned like Template A -->
          <img src="${absoluteLogoUrl}" alt="SilberArrows Logo" class="company-logo-inline" />
          
          <div class="content-container">
            <div class="title-section">
              <h1 class="title">${(() => {
                const title = (formData.title || formData.car_model || '').replace(/MERCEDES[-\s]*BENZ\s*/gi, '').replace(/^AMG\s*/gi, 'AMG ');
                return title;
              })()}</h1>
          </div>
            
          <!-- Car Specifications Grid - All 6 cards in one unified grid -->
            <div class="car-specs-grid">
              <div class="detail-card">
                <div class="detail-header">
                  <i class="fas fa-tachometer-alt"></i>
                  <span class="detail-title">Mileage</span>
          </div>
                <div class="detail-content">${formData.mileage || '25,000'} km</div>
        </div>
              
              <div class="detail-card">
                <div class="detail-header">
                  <i class="fas fa-bolt"></i>
                  <span class="detail-title">Horsepower</span>
                </div>
                <div class="detail-content">${formData.horsepower || '300'} HP</div>
              </div>
              
              <div class="detail-card">
                <div class="detail-header">
                  <i class="fas fa-paint-brush"></i>
                  <span class="detail-title">Exterior Color</span>
                </div>
                <div class="detail-content">${formData.exterior_color || 'Black'}</div>
              </div>
              
              <div class="detail-card">
                <div class="detail-header">
                  <i class="fas fa-car-side"></i>
                  <span class="detail-title">Interior Color</span>
                </div>
                <div class="detail-content">${formData.interior_color || 'Black'}</div>
          </div>
          
            <div class="detail-card">
              <div class="detail-header">
                <i class="fas fa-cogs"></i>
                <span class="detail-title">Engine</span>
              </div>
              <div class="detail-content">${formData.engine || '3.0L V6 Turbo'}</div>
            </div>
            
            <div class="detail-card">
              <div class="detail-header">
                <i class="fas fa-cog"></i>
                <span class="detail-title">Transmission</span>
              </div>
              <div class="detail-content">${formData.transmission || '9G-TRONIC Automatic'}</div>
            </div>
          </div>
          
          <!-- Key Equipment -->
          <div class="car-features">
            <div class="features-header">
              <i class="fas fa-list-check"></i>
              <span class="features-title">Key Equipment (highlights)</span>
            </div>
            <ul class="features-list">
              ${(() => {
                let equipmentText = formData.features?.join(', ') || 'Premium Interior Package, Advanced Driver Assistance, Panoramic Sunroof, AMG Styling Package, Leather Seats, Navigation System, Bluetooth Connectivity, Cruise Control, Parking Sensors, Automatic Climate Control, Keyless Entry, Power Windows, Electric Mirrors, Heated Seats, Premium Sound System, AMG Performance Package, Burmester Sound System, Ambient Lighting, Memory Seats, Wireless Charging, Head-Up Display, 360° Camera, Lane Keeping Assist, Blind Spot Monitoring, Adaptive Cruise Control';
                
                console.log('Key Equipment Text:', equipmentText);
                console.log('Contains newline?', equipmentText.includes('\n'));
                console.log('Contains arrow?', equipmentText.includes('↵'));
                
                // Handle different formats of equipment data
                let allEquipment = [];
                
                // Always try newline splitting first since that's the primary format
                if (equipmentText.includes('\n') || equipmentText.includes('↵')) {
                  // Handle newline characters (both actual newlines and arrow symbols)
                  allEquipment = equipmentText
                    .replace(/↵/g, '\n') // Replace arrow symbols with actual newlines
                    .split(/\n/) // Split by actual newlines
                    .map(item => item.trim());
                } else if (equipmentText.includes(',')) {
                  // Split by commas (comma-separated format)
                  allEquipment = equipmentText.split(',').map(item => item.trim());
                } else {
                  // Split by multiple spaces, semicolons, or camelCase patterns
                  allEquipment = equipmentText
                    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Split consecutive capitals
                    .split(/\s{2,}|;|\.|(?=[A-Z][A-Z\s]*[A-Z](?=[a-z]))|(?<=[a-z])(?=[A-Z])/) // Split on multiple spaces, punctuation, or camelCase
                    .map(item => item.trim());
                }
                
                // Filter and clean the equipment list
                allEquipment = allEquipment
                  .filter(item => item.length > 2 && item.length < 120) // Keep most items
                  .filter(item => item !== '') // Remove empty strings
                  .filter(item => item.match(/[A-Za-z]/)) // Must contain at least one letter
                  .filter(item => !item.match(/^[A-Z]{1,2}$/)); // Remove single/double letter abbreviations only
                
                console.log('Processed Equipment:', allEquipment);
                
                // Shuffle and pick 10 random items (reduced from 13)
                const shuffled = [...allEquipment].sort(() => 0.5 - Math.random());
                const selectedEquipment = shuffled.slice(0, 10);
                
                console.log('Selected Equipment:', selectedEquipment);
                
                return selectedEquipment.map(item => `<li>${item}</li>`).join('');
              })()}
            </ul>
          </div>
          
          <!-- Special Offer Section -->
          <div class="car-pricing">
            <div class="pricing-header">
              <i class="fas fa-tag"></i>
              <span class="pricing-title">Special Offer</span>
            </div>
            
            <!-- Main Car Price -->
            <div class="pricing-value">${formData.price ? '<svg height="0.7em" viewBox="0 0 344.84 299.91" style="display: inline-block; vertical-align: baseline; margin-right: 6px; margin-bottom: -0.02em;" xmlns="http://www.w3.org/2000/svg"><path fill="#555555" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>' + formData.price.toLocaleString() : '<svg height="0.7em" viewBox="0 0 344.84 299.91" style="display: inline-block; vertical-align: baseline; margin-right: 6px; margin-bottom: -0.02em;" xmlns="http://www.w3.org/2000/svg"><path fill="#555555" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>185,000'}</div>
            ${(() => {
              const monthly0Down = formData.monthly_0_down_aed;
              const monthly20Down = formData.monthly_20_down_aed;
              
              if (!monthly0Down && !monthly20Down) {
                return '<div class="cash-only">Cash Payment Only</div>';
              }
              return '';
            })()}
          </div>
          
          <!-- Monthly Payment Cards -->
          ${(() => {
            const monthly0Down = formData.monthly_0_down_aed;
            const monthly20Down = formData.monthly_20_down_aed;
            
            if (monthly0Down || monthly20Down) {
              let cards = '<div class="monthly-payments-grid">';
              
              if (monthly0Down) {
                cards += '<div class="monthly-card"><div class="monthly-header"><i class="fas fa-calendar-alt"></i><span class="monthly-title">0% Down</span></div><div class="monthly-amount"><svg height="0.7em" viewBox="0 0 344.84 299.91" style="display: inline-block; vertical-align: baseline; margin-right: 6px; margin-bottom: -0.02em;" xmlns="http://www.w3.org/2000/svg"><path fill="#555555" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>' + monthly0Down.toLocaleString() + '</div><div class="monthly-period">per month</div></div>';
              }
              
              if (monthly20Down) {
                cards += '<div class="monthly-card"><div class="monthly-header"><i class="fas fa-calendar-alt"></i><span class="monthly-title">20% Down</span></div><div class="monthly-amount"><svg height="0.7em" viewBox="0 0 344.84 299.91" style="display: inline-block; vertical-align: baseline; margin-right: 6px; margin-bottom: -0.02em;" xmlns="http://www.w3.org/2000/svg"><path fill="#555555" d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>' + monthly20Down.toLocaleString() + '</div><div class="monthly-period">per month</div></div>';
              }
              
              cards += '</div>';
              return cards;
            }
            return '';
          })()}
          
        </div>
      </div>
      </body>
      </html>`;
  }
};