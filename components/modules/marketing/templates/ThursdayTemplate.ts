import type { ContentPillarFormData } from '../types';

export const generateThursdayTemplate = (
  formData: ContentPillarFormData,
  renderImageUrl: string,
  absoluteLogoUrl: string,
  fontFaceCSS: string,
  templateType: 'A' | 'B' = 'A'
): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=1080, height=1920, initial-scale=1.0" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <style>
${fontFaceCSS}
      </style>
    </head>
    <body>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Resonate', 'Inter', sans-serif; background: linear-gradient(135deg, #7c2d12, #ea580c); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; }
      .content { padding: 40px; }
      .badge { background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: 20px; margin-bottom: 20px; }
      .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; }
      .description { font-size: 1.2rem; margin-bottom: 25px; }
      .testimonial { background: rgba(255,255,255,0.15); padding: 25px; border-radius: 15px; margin-bottom: 20px; }
      .stars { color: #fbbf24; font-size: 1.5rem; margin-bottom: 10px; }
      
      /* Font overrides */
      * { font-family: 'Resonate', 'Inter', sans-serif !important; }
      i, .fas, .far, .fab, .fal { font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important; font-weight: 900 !important; font-style: normal !important; }
    </style>
    
    <div class="content">
      <div class="badge">💬 ${formData.badgeText || 'TRANSFORMATION THURSDAY'}</div>
      <h1 class="title">${formData.title || 'Your Title Here'}</h1>
      <p class="description">${formData.description || 'Your description will appear here...'}</p>
      <div class="testimonial">
        <div class="stars">⭐⭐⭐⭐⭐</div>
        <p>"Exceptional service and premium quality!"</p>
      </div>
      <div>📞 +971 4 380 5515</div>
    </div>
    </body>
    </html>`;
};
