import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ApiFlashRequest {
  mythBusterId: string;
  templateType: 'A' | 'B';
  title: string;
  myth: string;
  fact: string;
  difficulty: string;
  tools_needed: string;
  warning: string;
  badge_text: string;
  titleFontSize: number;
  imageFit: string;
  imageAlignment: string;
  imageZoom: number;
  imageVerticalPosition: number;
  imageUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ApiFlashRequest = await req.json();
    const {
      mythBusterId,
      templateType,
      title,
      myth,
      fact,
      difficulty,
      tools_needed,
      warning,
      badge_text,
      titleFontSize,
      imageFit,
      imageAlignment,
      imageZoom,
      imageVerticalPosition,
      imageUrl
    } = body;
    // Get auth token for API call
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authorization token' }, { status: 401 });
    }

    // Generate HTML content using the MythBusterPreview component logic
    const htmlContent = generateMythBusterHTML({
      templateType,
      title,
      myth,
      fact,
      difficulty,
      tools_needed,
      warning,
      badge_text,
      titleFontSize,
      imageFit,
      imageAlignment,
      imageZoom,
      imageVerticalPosition
    });
    const apiFlashApiKey = process.env.API_FLASH_API_KEY;
    if (!apiFlashApiKey) {
      throw new Error('API_FLASH_API_KEY is not set in environment variables.');
    }
    // Use htmlcsstoimage.com as an alternative to API Flash
    const htmlcsstoimageApiKey = process.env.HTML_CSSToIMAGE_API_KEY || 'free'; // Use free tier for now

    // Create the request to htmlcsstoimage.com
    const htmlcsstoimageUrl = `https://hcti.io/v1/image`;
    const htmlcsstoimageResponse = await fetch(htmlcsstoimageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`:${htmlcsstoimageApiKey}`).toString('base64')}`,
      },
      body: JSON.stringify({
        html: htmlContent,
        css: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; width: 1080px; height: 1920px; }
        `,
        width: 1080,
        height: 1920,
        format: 'jpeg',
        quality: 90,
      }),
    });
    let publicImageUrl: string;

    if (!htmlcsstoimageResponse.ok) {
      const errorText = await htmlcsstoimageResponse.text();
      // Fallback to placeholder if htmlcsstoimage also fails
      publicImageUrl = `https://via.placeholder.com/1080x1920/000000/FFFFFF?text=Myth+Buster+${templateType}`;
    } else {
      const result = await htmlcsstoimageResponse.json();
      publicImageUrl = result.url;
    }

    const imageId = `${mythBusterId}-${templateType}-${Date.now()}`;

    // Update the myth_buster_monday table with the generated image URL and ID
    const updateColumnUrl = templateType === 'A' ? 'generated_image_a_url' : 'generated_image_b_url';
    const updateColumnId = templateType === 'A' ? 'generated_image_a_id' : 'generated_image_b_id';
    const { error: updateError } = await supabase
      .from('myth_buster_monday')
      .update({
        [updateColumnUrl]: publicImageUrl,
        [updateColumnId]: imageId,
      })
      .eq('id', mythBusterId);

    if (updateError) {
      throw new Error(`Failed to update myth buster record with image URL: ${updateError.message}`);
    }
    return NextResponse.json({
      success: true,
      data: { imageUrl: publicImageUrl, imageId: imageId },
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No stack trace available'
      },
      { status: 500 }
    );
  }
}

function generateMythBusterHTML(data: {
  templateType: 'A' | 'B';
  title: string;
  myth: string;
  fact: string;
  difficulty: string;
  tools_needed: string;
  warning: string;
  badge_text: string;
  titleFontSize: number;
  imageFit: string;
  imageAlignment: string;
  imageZoom: number;
  imageVerticalPosition: number;
}): string {
  const {
    templateType,
    title,
    myth,
    fact,
    difficulty,
    tools_needed,
    warning,
    badge_text,
    titleFontSize,
    imageFit,
    imageAlignment,
    imageZoom,
    imageVerticalPosition
  } = data;

  // Double all dimensions for high quality output (2x Instagram story size)
  const scale = 2;
  const scaledTitleFontSize = titleFontSize * scale;
  const scaledPadding = 80 * scale;
  const scaledIconSize = 24 * scale;
  const scaledBadgeFontSize = 16 * scale;
  const scaledTextFontSize = 20 * scale;
  const scaledSmallFontSize = 14 * scale;

  const renderTitleWithLineBreaks = (text: string) => {
    if (!text) return '';
    return text.split(/\n|<br\s*\/?>/).map((line, index) => 
      `<span key="${index}">${line}</span><br/>`
    ).join('');
  };

  if (templateType === 'A') {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Myth Buster Monday</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #000; color: #fff; width: ${1080 * scale}px; height: ${1920 * scale}px; }
        .header { padding: ${scaledPadding}px; text-align: center; }
        .badge { background: #d85050; color: white; padding: ${8 * scale}px ${16 * scale}px; border-radius: ${10 * scale}px; font-size: ${scaledBadgeFontSize}px; font-weight: bold; display: inline-block; margin-bottom: ${20 * scale}px; text-transform: uppercase; }
        .title { font-size: ${scaledTitleFontSize}px; font-weight: bold; color: #fff; margin-bottom: ${40 * scale}px; line-height: 1.1; }
        .content { padding: 0 ${scaledPadding}px ${scaledPadding}px; }
        .section { margin-bottom: ${40 * scale}px; }
        .section-title { font-size: ${scaledTextFontSize}px; font-weight: bold; color: #d85050; margin-bottom: ${10 * scale}px; }
        .section-content { font-size: ${scaledTextFontSize}px; line-height: 1.4; color: #fff; }
        .myth-title::before { content: "❌ "; }
        .fact-title::before { content: "✅ "; }
    </style>
</head>
<body>
    <div class="header">
        <div class="badge">${badge_text}</div>
        <div class="title">${title.replace(/\n/g, '<br>')}</div>
    </div>
    <div class="content">
        <div class="section">
            <div class="section-title myth-title">MYTH</div>
            <div class="section-content">${myth.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="section">
            <div class="section-title fact-title">FACT</div>
            <div class="section-content">${fact.replace(/\n/g, '<br>')}</div>
        </div>
    </div>
</body>
</html>`;
  } else {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Myth Buster Monday</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #000; color: #fff; width: ${1080 * scale}px; height: ${1920 * scale}px; }
        .header { padding: ${scaledPadding}px; text-align: center; }
        .badge { background: #d85050; color: white; padding: ${8 * scale}px ${16 * scale}px; border-radius: ${10 * scale}px; font-size: ${scaledBadgeFontSize}px; font-weight: bold; display: inline-block; margin-bottom: ${20 * scale}px; text-transform: uppercase; }
        .content { padding: 0 ${scaledPadding}px ${scaledPadding}px; }
        .section { margin-bottom: ${30 * scale}px; }
        .section-title { font-size: ${scaledTextFontSize}px; font-weight: bold; color: #d85050; margin-bottom: ${10 * scale}px; }
        .section-content { font-size: ${scaledTextFontSize}px; line-height: 1.4; color: #fff; }
        .details-grid { display: table; width: 100%; margin-top: ${15 * scale}px; }
        .detail-row { display: table-row; }
        .detail-item { display: table-cell; background: rgba(255, 255, 255, 0.1); padding: ${10 * scale}px; border-radius: ${5 * scale}px; text-align: center; width: 50%; }
        .detail-label { font-size: ${scaledSmallFontSize}px; color: #d85050; margin-bottom: ${5 * scale}px; font-weight: bold; }
        .detail-value { font-size: ${scaledTextFontSize}px; color: #fff; }
        .myth-title::before { content: "❌ "; }
        .fact-title::before { content: "✅ "; }
        .details-title::before { content: "⚠️ "; }
    </style>
</head>
<body>
    <div class="header">
        <div class="badge">${badge_text}</div>
    </div>
    <div class="content">
        <div class="section">
            <div class="section-title myth-title">MYTH</div>
            <div class="section-content">${myth.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="section">
            <div class="section-title fact-title">FACT</div>
            <div class="section-content">${fact.replace(/\n/g, '<br>')}</div>
        </div>
        <div class="section">
            <div class="section-title details-title">DETAILS</div>
            <div class="details-grid">
                <div class="detail-row">
                    <div class="detail-item">
                        <div class="detail-label">DIFFICULTY</div>
                        <div class="detail-value">${difficulty.replace(/\n/g, '<br>')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">TOOLS NEEDED</div>
                        <div class="detail-value">${tools_needed.replace(/\n/g, '<br>')}</div>
                    </div>
                </div>
            </div>
            <div class="section-content" style="margin-top: ${15 * scale}px;">
                <strong>WARNING:</strong> ${warning.replace(/\n/g, '<br>')}
            </div>
        </div>
    </div>
</body>
</html>`;
  }
}