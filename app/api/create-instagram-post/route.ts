import { NextRequest, NextResponse } from 'next/server'
// @ts-ignore
import sharp from 'sharp'

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const image = formData.get('image') as File
    const imageUrl = formData.get('imageUrl') as string
    const textOverlaysStr = formData.get('textOverlays') as string

    let imageBuffer: Buffer

    // Get image buffer
    if (image) {
      const arrayBuffer = await image.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else if (imageUrl) {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch image from URL')
      }
      const arrayBuffer = await response.arrayBuffer()
      imageBuffer = Buffer.from(arrayBuffer)
    } else {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const textOverlays: TextOverlay[] = textOverlaysStr ? JSON.parse(textOverlaysStr) : []

    // Get original image dimensions
    const { width: originalWidth, height: originalHeight } = await sharp(imageBuffer).metadata()
    if (!originalWidth || !originalHeight) {
      throw new Error('Failed to get image dimensions')
    }

    // Target dimensions for 4:5 aspect ratio (Instagram portrait)
    const targetWidth = 864
    const targetHeight = 1080

    console.log('Original dimensions:', originalWidth, originalHeight)
    console.log('Target dimensions:', targetWidth, targetHeight)

    console.log('🎨 IMPLEMENTING CONTENT-AWARE BACKGROUND FILL')
    console.log('Original ratio:', originalWidth / originalHeight)
    console.log('Target ratio:', targetWidth / targetHeight)
    
    // --- GRADIENT FROM ORIGINAL IMAGE ---
    // 1. Sample top/bottom 10% of original image for gradient colors
    const sampleBand = Math.max(1, Math.floor(originalHeight * 0.1));
    const origRaw = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { data: origData, info: origInfo } = origRaw;
    function avgColorRowRange(y0, y1) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = 0; x < origInfo.width; x++) {
          const idx = (y * origInfo.width + x) * 4;
          r += origData[idx];
          g += origData[idx + 1];
          b += origData[idx + 2];
          a += origData[idx + 3];
          n++;
        }
      }
      return [Math.round(r / n), Math.round(g / n), Math.round(b / n), Math.round(a / n)];
    }
    const topColor = avgColorRowRange(0, sampleBand);
    const bottomColor = avgColorRowRange(origInfo.height - sampleBand, origInfo.height);

    // 2. Create vertical gradient background
    const bgBuffer = await (async () => {
      const buf = Buffer.alloc(targetWidth * targetHeight * 4);
      for (let y = 0; y < targetHeight; y++) {
        const t = y / (targetHeight - 1);
        const r = Math.round(topColor[0] * (1 - t) + bottomColor[0] * t);
        const g = Math.round(topColor[1] * (1 - t) + bottomColor[1] * t);
        const b = Math.round(topColor[2] * (1 - t) + bottomColor[2] * t);
        const a = Math.round(topColor[3] * (1 - t) + bottomColor[3] * t);
        for (let x = 0; x < targetWidth; x++) {
          const idx = (y * targetWidth + x) * 4;
          buf[idx] = r;
          buf[idx + 1] = g;
          buf[idx + 2] = b;
          buf[idx + 3] = a;
        }
      }
      return sharp(buf, { raw: { width: targetWidth, height: targetHeight, channels: 4 } }).png().toBuffer();
    })();

    // 3. Contain the image (never crop), transparent background
    const contained = await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    let processedImageBuffer = await sharp(bgBuffer)
      .composite([{ input: contained, top: 0, left: 0 }])
      .jpeg({ quality: 95 })
      .toBuffer();

    // If we have text overlays, create them as SVG and composite
    if (textOverlays.length > 0) {
      // Create SVG with text overlays
      const svgElements = textOverlays.map(overlay => {
        // Convert percentage positions to pixels
        const xPos = (overlay.x / 100) * targetWidth
        const yPos = (overlay.y / 100) * targetHeight
        
        // Split long text into multiple lines if needed
        const maxCharsPerLine = overlay.fontSize > 20 ? 25 : 30
        const words = overlay.text.split(' ')
        const lines = []
        let currentLine = ''
        
        for (const word of words) {
          if ((currentLine + ' ' + word).length <= maxCharsPerLine) {
            currentLine = currentLine ? currentLine + ' ' + word : word
          } else {
            if (currentLine) lines.push(currentLine)
            currentLine = word
          }
        }
        if (currentLine) lines.push(currentLine)
        
        // Determine stroke color based on text color (for better readability)
        const isLightColor = overlay.color === '#ffffff' || overlay.color === '#ffd700' || overlay.color === '#d4af37'
        const strokeColor = isLightColor ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
        
        // Create text elements for each line with background
        const backgroundElements = lines.map((line, index) => {
          const lineY = yPos + (index - (lines.length - 1) / 2) * (overlay.fontSize * 1.2)
          const textWidth = line.length * overlay.fontSize * 0.6 // Approximate text width
          const padding = 8
          
          return `
            <rect 
              x="${xPos - textWidth/2 - padding}" 
              y="${lineY - overlay.fontSize/2 - padding/2}" 
              width="${textWidth + padding*2}" 
              height="${overlay.fontSize + padding}"
              fill="rgba(255,255,255,0.8)"
              rx="4"
            />
            <text 
              x="${xPos}" 
              y="${lineY}" 
              font-family="Arial, sans-serif" 
              font-size="${overlay.fontSize}" 
              font-weight="${overlay.fontWeight}" 
              fill="${overlay.color}"
              text-anchor="middle"
              dominant-baseline="middle"
            >
              ${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
            </text>
          `
        }).join('')
        
        return backgroundElements
      }).join('\n')

      const svg = `
        <svg width="${targetWidth}" height="${targetHeight}" xmlns="http://www.w3.org/2000/svg">
          ${svgElements}
        </svg>
      `

      // Convert SVG to buffer
      const svgBuffer = Buffer.from(svg)

      // Composite the text overlay onto the image
      processedImageBuffer = await sharp(processedImageBuffer)
        .composite([{
          input: svgBuffer,
          top: 0,
          left: 0
        }])
        .jpeg({ quality: 95 })
        .toBuffer()
    }

    // Convert processed image to base64 data URL for immediate return
    const base64 = processedImageBuffer.toString('base64')
    const dataUrl = `data:image/jpeg;base64,${base64}`

    return NextResponse.json({
      success: true,
      imageUrl: dataUrl,
      dimensions: {
        width: targetWidth,
        height: targetHeight
      }
    })

  } catch (error) {
    console.error('Error processing image:', error)
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    )
  }
} 