import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import fs from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { carDetails, pricing, firstImageUrl, secondImageUrl } = await request.json();
    
    console.log('🎨 Generating price drop images for:', carDetails.stockNumber);
    console.log('📊 Car details received:', carDetails);
    console.log('💰 Pricing details:', pricing);
    console.log('🖼️ Image URLs:', { firstImageUrl, secondImageUrl });
    
    // Read the HTML template
    const templatePath = path.join(process.cwd(), 'public', 'templates', 'price-drop-template.html');
    let htmlTemplate = await fs.readFile(templatePath, 'utf-8');
    
    console.log('📄 Template loaded, length:', htmlTemplate.length);
    console.log('🔍 Before replacement - checking for placeholders:');
    console.log('- {{year}} found:', htmlTemplate.includes('{{year}}'));
    console.log('- {{model}} found:', htmlTemplate.includes('{{model}}'));
    console.log('- {{carImageUrl1}} found:', htmlTemplate.includes('{{carImageUrl1}}'));
    
    // Replace placeholders with actual data
    const populatedHtml = htmlTemplate
      .replace(/\{\{year\}\}/g, carDetails.year.toString())
      .replace(/\{\{model\}\}/g, carDetails.model)
      .replace(/\{\{mileage\}\}/g, carDetails.mileage)
      .replace(/\{\{horsepower\}\}/g, (carDetails.horsepower ?? '').toString())
      .replace(/\{\{stockNumber\}\}/g, carDetails.stockNumber)
      .replace(/\{\{carImageUrl1\}\}/g, firstImageUrl)
      .replace(/\{\{carImageUrl2\}\}/g, secondImageUrl)
      .replace(/\{\{wasPrice\}\}/g, pricing.wasPrice.toLocaleString())
      .replace(/\{\{nowPrice\}\}/g, pricing.nowPrice.toLocaleString())
      .replace(/\{\{savings\}\}/g, pricing.savings.toLocaleString())
      .replace(/\{\{monthlyPayment\}\}/g, (pricing.monthlyPayment ?? 0).toLocaleString());
    
    console.log('🔍 After replacement - checking for remaining placeholders:');
    console.log('- {{year}} remaining:', populatedHtml.includes('{{year}}'));
    console.log('- {{model}} remaining:', populatedHtml.includes('{{model}}'));
    console.log('- {{carImageUrl1}} remaining:', populatedHtml.includes('{{carImageUrl1}}'));
    console.log('- {{carImageUrl2}} remaining:', populatedHtml.includes('{{carImageUrl2}}'));
    console.log('🔗 Image URLs used:');
    console.log('- First image URL:', firstImageUrl);
    console.log('- Second image URL:', secondImageUrl);
    console.log('📝 HTML template populated successfully');
    
    // Launch browser: try Playwright, fallback to Puppeteer
    let page: any;
    let browser: any;
    let isPuppeteer = false;
    try {
      // @ts-ignore - Playwright is optional in production; resolved only when available
      const { chromium } = await import('playwright');
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      page = await browser.newPage();
      console.log('✅ Using Playwright');
    } catch (e) {
      console.warn('⚠️ Playwright not available, falling back to Puppeteer:', e);
      const puppeteer = (await import('puppeteer')).default;
      isPuppeteer = true;
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const context = await browser.createIncognitoBrowserContext();
      page = await context.newPage();
      console.log('✅ Using Puppeteer fallback');
    }
    
    // Set content and wait for everything to load
    await page.setContent(populatedHtml, { 
      waitUntil: isPuppeteer ? 'networkidle0' : 'networkidle',
      timeout: 30000 
    });
    
    // Wait for fonts to load
    await page.evaluate(() => {
      return document.fonts.ready;
    });
    
    // Wait a bit more for rendering
    await page.waitForTimeout(2000);
    
    console.log('📸 Taking screenshots...');
    
    // Generate 4:5 format (1080x1350)
    if (isPuppeteer) {
      await page.setViewport({ width: 1080, height: 1350 });
    } else {
      await page.setViewportSize({ width: 1080, height: 1350 });
    }
    await page.waitForTimeout(1000);
    const image45 = await page.screenshot({ type: 'png', fullPage: false, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    
    // Generate 9:16 format (1080x1920) 
    if (isPuppeteer) {
      await page.setViewport({ width: 1080, height: 1920 });
    } else {
      await page.setViewportSize({ width: 1080, height: 1920 });
    }
    await page.waitForTimeout(1000);
    const imageStory = await page.screenshot({ type: 'png', fullPage: false, clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    
    await browser.close();
    
    console.log('✅ Successfully generated both image formats');
    
    return NextResponse.json({
      success: true,
      image45: image45.toString('base64'),
      imageStory: imageStory.toString('base64')
    });
    
  } catch (error) {
    console.error('❌ Error generating price drop images:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate images' },
      { status: 500 }
    );
  }
} 