import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

interface GenerateImageRequest {
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
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();

    // Set viewport to 2x Instagram story size for better quality (2160x3840)
    await page.setViewport({ width: 2160, height: 3840 });

    // Generate the HTML for the template
    const htmlContent = generateTemplateHTML(body);

    // Set the page content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Wait for fonts and images to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot at 2x size for better quality
    const screenshotBuffer = await page.screenshot({
      type: 'png',
      quality: 100,
      clip: {
        x: 0,
        y: 0,
        width: 2160,
        height: 3840
      }
    });

    await browser.close();

    // Return the image
    return new NextResponse(screenshotBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': screenshotBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
      },
    });

  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

function generateTemplateHTML(data: GenerateImageRequest): string {
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
    imageVerticalPosition = 0
  } = data;

  // Clean title like in original template
  const cleanTitle = (car_model || title || 'Your Title Here')
    .replace(/MERCEDES[-\s]*BENZ\s*/gi, '')
    .replace(/^AMG\s*/gi, 'AMG ');

  // Convert <br> tags and newlines to HTML line breaks
  const renderTitleWithLineBreaks = (text: string) => {
    if (!text) return '';
    
    // Split by newlines and <br> tags
    const lines = text.split(/\n|<br\s*\/?>/gi);
    
    return lines.map((line, index) => 
      line + (index < lines.length - 1 ? '<br>' : '')
    ).join('');
  };

  if (templateType === 'A') {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; }

          @font-face {
            font-family: 'Resonate';
            src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Black.woff2') format('woff2');
            font-weight: 900;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Resonate';
            src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Bold.woff2') format('woff2');
            font-weight: 700;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Resonate';
            src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Medium.woff2') format('woff2');
            font-weight: 500;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Resonate';
            src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Regular.woff2') format('woff2');
            font-weight: 400;
            font-style: normal;
            font-display: swap;
          }
          @font-face {
            font-family: 'Resonate';
            src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Light.woff2') format('woff2');
            font-weight: 300;
            font-style: normal;
            font-display: swap;
          }

          * { font-family: 'Resonate', 'Inter', sans-serif; }
        </style>
      </head>
      <body>
        <div style="
          display: flex;
          flex-direction: column;
          width: 2160px;
          height: 3840px;
          font-family: 'Resonate', 'Inter', sans-serif;
          background: #000000;
          color: #ffffff;
          overflow: hidden;
          position: relative;
        ">
          <!-- Image Section -->
          <div style="
            position: relative;
            width: 100%;
            height: 69.5%;
          ">
            <img
              src="${imageUrl || logoUrl}"
              style="
                width: 100%;
                height: 100%;
                object-fit: ${imageFit};
                object-position: ${imageAlignment};
                transform: scale(${imageZoom / 100}) translateY(${imageVerticalPosition}px);
              "
              alt="Background"
            />
          </div>

          <!-- Content Section -->
          <div style="
            padding: 40px 80px 80px 80px;
            height: 30.5%;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 24px;
            overflow: visible;
          ">
            <!-- Badge Row -->
            <div style="
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 32px;
              margin-top: 40px;
            ">
              <div style="
                background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1);
                color: #000;
                padding: 32px 64px;
                border-radius: 50px;
                font-weight: 500;
                font-size: 48px;
                text-transform: uppercase;
                letter-spacing: 1.6px;
                white-space: nowrap;
                display: inline-flex;
                align-items: center;
                box-shadow: 0 12px 40px rgba(255,255,255,0.1);
                border: 4px solid rgba(255,255,255,0.2);
              ">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                  <path d="M10.29 3.86L1.82 18.02C1 19.39 2 21.14 3.53 21.14H20.47C22 21.14 23 19.39 22.18 18.02L13.71 3.86C12.93 2.54 11.07 2.54 10.29 3.86ZM11 8.14H13V14.14H11V8.14ZM11 16.14H13V18.14H11V16.14Z"/>
                </svg>
                ${badgeText}
              </div>
              <img
                src="${logoUrl}"
                alt="SilberArrows Logo"
                style="
                  height: 192px;
                  width: auto;
                  filter: brightness(1.3) drop-shadow(0 4px 8px rgba(0,0,0,0.3));
                  margin-top: 8px;
                  flex-shrink: 0;
                "
              />
            </div>

            <!-- Content Container -->
            <div style="margin-bottom: 48px;">
              <h1 style="
                font-size: ${titleFontSize * 2}px;
                font-weight: 900;
                color: #ffffff;
                line-height: 0.95;
                text-shadow: 0 4px 8px rgba(0,0,0,0.3);
                margin-bottom: 24px;
                font-family: 'Resonate', 'Inter', sans-serif;
                text-align: left;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
                max-height: ${titleFontSize * 2 * 1.9}px;
                word-break: break-word;
                hyphens: auto;
                text-transform: uppercase;
              ">
                ${renderTitleWithLineBreaks(cleanTitle)}
              </h1>
            </div>
          </div>

          <!-- Arrow indicator -->
          <div style="
            position: fixed;
            left: 80px;
            right: 80px;
            bottom: 240px;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 32px;
            background: rgba(255,255,255,0.15);
            border: 4px solid rgba(255,255,255,0.3);
            padding: 48px 64px;
            border-radius: 40px;
            backdrop-filter: blur(20px);
            font-weight: 400;
            font-size: 64px;
            box-shadow: 0 16px 64px rgba(0,0,0,0.2);
            font-family: 'Resonate', 'Inter', sans-serif;
          ">
            <i class="fas fa-arrow-right" style="margin-right: 24px;"></i>
            <span style="font-weight: bold;">More Details</span>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Template B - With myth and fact sections
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }

        @font-face {
          font-family: 'Resonate';
          src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Black.woff2') format('woff2');
          font-weight: 900;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Bold.woff2') format('woff2');
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Medium.woff2') format('woff2');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Regular.woff2') format('woff2');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Resonate';
          src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Light.woff2') format('woff2');
          font-weight: 300;
          font-style: normal;
          font-display: swap;
        }

        * { font-family: 'Resonate', 'Inter', sans-serif; }
      </style>
    </head>
    <body>
      <div style="
        display: flex;
        flex-direction: column;
        width: 2160px;
        height: 3840px;
        font-family: 'Resonate', 'Inter', sans-serif;
        background: #000000;
        color: #ffffff;
        overflow: hidden;
        position: relative;
      ">
        <!-- Background image with blur overlay -->
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 69.5%;
          z-index: 0;
        ">
          <img
            src="${imageUrl || logoUrl}"
            style="
              width: 100%;
              height: 100%;
              object-fit: cover;
              filter: blur(8px);
              opacity: 0.3;
              transform: scale(${imageZoom / 100});
            "
            alt="Background"
          />
          <div style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, rgba(0,0,0,0.7), rgba(0,0,0,0.5));
          " />
        </div>

        <!-- Content -->
        <div style="
          position: relative;
          z-index: 1;
          padding: calc(40px + 6vh) 80px 80px 80px;
          height: 30.5%;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          gap: 24px;
          overflow: visible;
        ">
          <!-- Badge Row -->
          <div style="
            margin-top: 120px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 32px;
          ">
            <div style="
              background: linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1);
              color: #000;
              padding: 32px 64px;
              border-radius: 50px;
              font-weight: 500;
              font-size: 48px;
              text-transform: uppercase;
              letter-spacing: 1.6px;
              white-space: nowrap;
              display: inline-flex;
              align-items: center;
              box-shadow: 0 12px 40px rgba(255,255,255,0.1);
              border: 4px solid rgba(255,255,255,0.2);
              font-family: 'Resonate', 'Inter', sans-serif;
            ">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="#000" xmlns="http://www.w3.org/2000/svg" style="margin-right: 12px;">
                <path d="M10.29 3.86L1.82 18.02C1 19.39 2 21.14 3.53 21.14H20.47C22 21.14 23 19.39 22.18 18.02L13.71 3.86C12.93 2.54 11.07 2.54 10.29 3.86ZM11 8.14H13V14.14H11V8.14ZM11 16.14H13V18.14H11V16.14Z"/>
              </svg>
              ${badgeText}
            </div>
            <img
              src="${logoUrl}"
              alt="SilberArrows Logo"
              style="
                height: 192px;
                width: auto;
                margin-top: 8px;
                flex-shrink: 0;
                display: block;
                visibility: visible;
                opacity: 1;
                z-index: 999;
                filter: brightness(1.3) drop-shadow(0 4px 8px rgba(0,0,0,0.3));
              "
            />
          </div>

          <!-- Content Container -->
          <div style="margin-bottom: 48px;">

            <!-- Myth Section -->
            ${myth ? `
            <div style="
              background: rgba(255, 255, 255, 0.1);
              border: 2px solid rgba(255, 255, 255, 0.15);
              border-radius: 32px;
              padding: 64px;
              margin-bottom: 48px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 24px;
                margin-bottom: 32px;
              ">
                <span style="display: inline-flex; align-items: center;">
                  <svg width="82" height="82" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 1 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z"/>
                  </svg>
                </span>
                <span style="
                  font-size: 82px;
                  font-weight: 700;
                  color: #ef4444;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  font-family: 'Resonate', 'Inter', sans-serif;
                ">
                  The Myth
                </span>
              </div>
              <div style="
                font-size: 74px;
                color: #e2e8f0;
                line-height: 1.4;
                font-family: 'Resonate', 'Inter', sans-serif;
                font-weight: 300;
              ">
                ${renderTitleWithLineBreaks(myth)}
              </div>
            </div>
            ` : ''}

            <!-- Fact Section -->
            ${fact ? `
            <div style="
              background: rgba(255, 255, 255, 0.1);
              border: 2px solid rgba(255, 255, 255, 0.15);
              border-radius: 32px;
              padding: 64px;
              margin-bottom: 48px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 24px;
                margin-bottom: 32px;
              ">
                <span style="display: inline-flex; align-items: center;">
                  <svg width="82" height="82" viewBox="0 0 24 24" fill="#22c55e" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                  </svg>
                </span>
                <span style="
                  font-size: 82px;
                  font-weight: 700;
                  color: #22c55e;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  font-family: 'Resonate', 'Inter', sans-serif;
                ">
                  The Fact
                </span>
              </div>
              <div style="
                font-size: 74px;
                color: #e2e8f0;
                line-height: 1.4;
                font-family: 'Resonate', 'Inter', sans-serif;
                font-weight: 300;
              ">
                ${renderTitleWithLineBreaks(fact)}
              </div>
            </div>
            ` : ''}

            <!-- Tech Grid - Difficulty and Tools -->
            ${difficulty && tools_needed ? `
            <div style="
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 48px;
              margin: 48px 0;
            ">
              <div style="
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.15);
                border-radius: 32px;
                padding: 64px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
                text-align: center;
              ">
                <i class="fas fa-gauge-high" style="
                  font-size: 74px;
                  margin-bottom: 16px;
                  color: #cbd5e1;
                "></i>
                <div style="
                  font-size: 46px;
                  color: #cbd5e1;
                  margin-bottom: 12px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  font-family: 'Resonate', 'Inter', sans-serif;
                ">
                  Difficulty
                </div>
                <div style="
                  font-size: 64px;
                  color: #f8fafc;
                  font-weight: 700;
                  font-family: 'Resonate', 'Inter', sans-serif;
                ">
                  ${renderTitleWithLineBreaks(difficulty)}
                </div>
              </div>

              <div style="
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.15);
                border-radius: 32px;
                padding: 64px;
                backdrop-filter: blur(10px);
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
                text-align: center;
              ">
                <i class="fas fa-clock" style="
                  font-size: 74px;
                  margin-bottom: 16px;
                  color: #cbd5e1;
                "></i>
                <div style="
                  font-size: 46px;
                  color: #cbd5e1;
                  margin-bottom: 12px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  font-family: 'Resonate', 'Inter', sans-serif;
                ">
                  Tools Needed
                </div>
                <div style="
                  font-size: 64px;
                  color: #f8fafc;
                  font-weight: 700;
                  font-family: 'Resonate', 'Inter', sans-serif;
                ">
                  ${renderTitleWithLineBreaks(tools_needed)}
                </div>
              </div>
            </div>
            ` : ''}

            <!-- Warning Section -->
            ${warning ? `
            <div style="
              background: rgba(255, 100, 100, 0.1);
              border: 2px solid rgba(255, 150, 150, 0.3);
              border-radius: 32px;
              padding: 64px;
              margin: 48px 0;
              backdrop-filter: blur(10px);
            ">
              <div style="
                display: flex;
                align-items: center;
                gap: 24px;
                margin-bottom: 32px;
              ">
                <i class="fas fa-exclamation-triangle" style="
                  font-size: 64px;
                  color: #ff6b6b;
                "></i>
                <span style="
                  font-size: 64px;
                  font-weight: 700;
                  color: #ff6b6b;
                  text-transform: uppercase;
                  letter-spacing: 1px;
                  font-family: 'Resonate', 'Inter', sans-serif;
                ">
                  Important Warning
                </span>
              </div>
              <div style="
                font-size: 64px;
                color: #ffebeb;
                line-height: 1.4;
                font-family: 'Resonate', 'Inter', sans-serif;
                font-weight: 300;
              ">
                ${renderTitleWithLineBreaks(warning)}
              </div>
            </div>
            ` : ''}
          </div>

          <!-- Contact -->
          <div style="
            position: fixed;
            left: 80px;
            right: 80px;
            bottom: 240px;
            z-index: 5;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 32px;
            background: rgba(255,255,255,0.15);
            border: 4px solid rgba(255,255,255,0.3);
            padding: 48px 64px;
            border-radius: 40px;
            backdrop-filter: blur(20px);
            font-weight: 400;
            font-size: 64px;
            box-shadow: 0 16px 64px rgba(0,0,0,0.2);
            font-family: 'Resonate', 'Inter', sans-serif;
          ">
            <i class="fas fa-phone" style="margin-right: 16px;"></i>
            <i class="fab fa-whatsapp" style="margin-right: 16px;"></i>
            <span style="font-weight: bold;">Call or WhatsApp us at +971 4 380 5515</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
