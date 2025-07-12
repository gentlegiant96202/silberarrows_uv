import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabaseClient';

// Vercel-compatible scraper function
async function scrapeDubizzleVercel(url: string, targetLeads: number = 20, jobId: string) {
  console.log(`🚀 VERCEL SCRAPER - Starting for ${targetLeads} leads`);
  
  try {
    // Update job status
    await supabase.from('scrape_jobs').update({ 
      status: 'running',
      log: 'Starting Vercel-compatible scraper...'
    }).eq('id', jobId);

    // Import Playwright dynamically to handle potential installation issues
    let chromium;
    try {
      const playwright = await import('playwright');
      chromium = playwright.chromium;
    } catch (error) {
      throw new Error('Playwright not available in this environment');
    }

    // Launch browser with Vercel-compatible settings
    const browser = await chromium.launch({
      headless: true, // Must be headless for Vercel
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-translate',
        '--disable-sync',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--mute-audio',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-popup-blocking',
        '--single-process', // Important for serverless
        '--no-zygote', // Important for serverless
        '--disable-ipc-flooding-protection'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'Asia/Dubai'
    });

    const page = await context.newPage();
    page.setDefaultTimeout(15000); // Reduced timeout for Vercel
    page.setDefaultNavigationTimeout(15000);

    // Simplified scraping - just get a few listings from first page
    console.log(`🔍 Loading search page: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Quick popup dismissal
    try {
      const popup = page.locator('button:has-text("Accept"), button:has-text("Don\'t Allow")');
      if (await popup.count()) {
        await popup.first().click({ timeout: 2000 });
      }
    } catch {}

    // Extract car URLs from first page only (to stay within time limits)
    const pageSource = await page.content();
    const urlPattern = /\/motors\/used-cars\/[^\/]+\/[^\/]+\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'\s>]+/g;
    const matches = pageSource.match(urlPattern) || [];
    
    const carUrls = Array.from(new Set(matches.map(match => 
      match.startsWith('http') ? match : `https://dubai.dubizzle.com${match}`
    )));

    console.log(`📋 Found ${carUrls.length} cars on first page`);
    
    if (carUrls.length === 0) {
      await supabase.from('scrape_jobs').update({ 
        status: 'error',
        finished_at: new Date(),
        log: 'No car listings found on search page'
      }).eq('id', jobId);
      return;
    }

    await supabase.from('scrape_jobs').update({ 
      total: carUrls.length,
      log: `Found ${carUrls.length} cars, starting to process...`
    }).eq('id', jobId);

    let successfulLeads = 0;
    let carsChecked = 0;
    
    // Process a limited number of cars to stay within Vercel timeout
    const maxCarsToProcess = Math.min(carUrls.length, 10); // Limit to 10 cars max
    
    for (let i = 0; i < maxCarsToProcess && successfulLeads < targetLeads; i++) {
      const carUrl = carUrls[i];
      carsChecked++;
      
      console.log(`🚗 Processing car ${carsChecked}/${maxCarsToProcess}`);
      
      try {
        // Navigate to car page
        await page.goto(carUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
        // Extract basic info
        let title = '';
        let price = '';
        
        try {
          const titleElement = await page.locator('h1, [data-testid*="title"]').first();
          title = await titleElement.textContent() || '';
        } catch {}
        
        try {
          const priceElement = await page.locator('[class*="price"], [data-testid*="price"]').first();
          const priceText = await priceElement.textContent() || '';
          price = priceText.replace(/[^\d]/g, '');
        } catch {}

        // Try to find and click call button
        let phoneNumber = '';
        try {
          const callButton = page.locator('button:has-text("Call"), a:has-text("Call")').first();
          if (await callButton.count() > 0) {
            await callButton.click({ timeout: 3000 });
            await page.waitForTimeout(2000);
            
            // Look for phone number
            const phoneSelectors = [
              'a[href^="tel:"]',
              '[class*="phone"]',
              'span:has-text("+971")',
              'span:has-text("050")',
              'span:has-text("055")',
              'span:has-text("056")'
            ];
            
            for (const selector of phoneSelectors) {
              try {
                const element = await page.locator(selector).first();
                if (await element.count() > 0) {
                  const text = await element.textContent();
                  if (text) {
                    const phoneMatch = text.match(/(\+971|971|0)(50|55|56|52|54)\d{7}/);
                    if (phoneMatch) {
                      phoneNumber = phoneMatch[0];
                      break;
                    }
                  }
                }
              } catch {}
            }
          }
        } catch {}

        // Check for duplicates
        if (phoneNumber) {
          const { data: existing } = await supabase
            .from('consignments')
            .select('id')
            .eq('phone_number', phoneNumber)
            .limit(1);
          
          if (existing && existing.length > 0) {
            console.log(`⏭️  Duplicate phone: ${phoneNumber}`);
            continue;
          }
        }

        // Save to database if we have minimum required info
        if (title && price) {
          const dbData = {
            status: 'new_lead',
            phone_number: phoneNumber || null,
            vehicle_model: title,
            asking_price: price ? parseInt(price, 10) || null : null,
            listing_url: carUrl,
          };
          
          await supabase.from('consignments').insert(dbData);
          successfulLeads++;
          console.log(`✅ Lead ${successfulLeads}: ${title} - ${phoneNumber || 'No phone'}`);
        }
        
        // Update job progress
        await supabase.from('scrape_jobs').update({ 
          processed: carsChecked,
          successful_leads: successfulLeads,
          log: `Processed ${carsChecked} cars, found ${successfulLeads} leads`
        }).eq('id', jobId);
        
        // Small delay to avoid overwhelming the server
        await page.waitForTimeout(1000);
        
      } catch (err) {
        console.error(`❌ Error processing car ${carsChecked}: ${err}`);
      }
    }
    
    // Close browser
    await browser.close();
    
    // Update final job status
    await supabase.from('scrape_jobs').update({ 
      status: 'finished',
      finished_at: new Date(),
      log: `Completed: ${successfulLeads} leads from ${carsChecked} cars processed`
    }).eq('id', jobId);
    
    console.log(`🎉 Vercel scraping completed: ${successfulLeads} leads`);
    
  } catch (error: any) {
    console.error('Scraper error:', error);
    
    await supabase.from('scrape_jobs').update({ 
      status: 'error',
      finished_at: new Date(),
      log: `Error: ${error.message}`
    }).eq('id', jobId);
    
    throw error;
  }
}

export async function POST(req: Request) {
  const { url, max } = await req.json();
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  const id = randomUUID();

  try {
    // Insert job row
    await supabase.from('scrape_jobs').insert({ 
      id, 
      status: 'queued',
      total: 0,
      processed: 0,
      successful_leads: 0
    });

    // Run the Vercel-compatible scraper
    // Note: This will run synchronously to avoid timeout issues
    await scrapeDubizzleVercel(url, max ?? 20, id);

    return NextResponse.json({ jobId: id }, { status: 202 });
    
  } catch (error: any) {
    console.error('API error:', error);
    
    // Update job status to error
    await supabase.from('scrape_jobs').update({ 
      status: 'error', 
      finished_at: new Date(),
      log: `API Error: ${error.message}`
    }).eq('id', id);
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id query param required' }, { status: 400 });

  const { data } = await supabase.from('scrape_jobs').select('*').eq('id', id).single();
  if (!data) return NextResponse.json({ error: 'job not found' }, { status: 404 });
  return NextResponse.json(data);
} 