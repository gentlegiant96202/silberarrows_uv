import type { ContentPillarFormData } from '../types';

export const generateSaturdayTemplate = (
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
      body { font-family: 'Resonate', 'Inter', sans-serif; background: linear-gradient(135deg, #0891b2, #06b6d4); color: #ffffff; height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; }
      .content { padding: 40px; }
      .badge { background: rgba(255,255,255,0.2); padding: 12px 25px; border-radius: 25px; margin-bottom: 20px; }
      .title { font-size: 3rem; font-weight: 700; margin-bottom: 15px; }
      .description { font-size: 1.2rem; margin-bottom: 25px; }
      .features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 25px; }
      .feature { background: rgba(255,255,255,0.15); padding: 25px; border-radius: 12px; }
      
      /* Font overrides */
      * { font-family: 'Resonate', 'Inter', sans-serif !important; }
      i, .fas, .far, .fab, .fal { font-family: "Font Awesome 6 Free", "Font Awesome 6 Brands" !important; font-weight: 900 !important; font-style: normal !important; }
    </style>
    
    <div class="content">
      <div class="badge">☀️ ${formData.badgeText || 'SOCIAL SATURDAY'}</div>
      <h1 class="title">${formData.title || 'Your Title Here'}</h1>
      <p class="description">${formData.description || 'Your description will appear here...'}</p>
      <div class="features">
        <div class="feature">❤️<br>Passion</div>
        <div class="feature">👥<br>Community</div>
      </div>
      <div>📞 +971 4 380 5515</div>
    </div>
    </body>
    </html>`;
};
