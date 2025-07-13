#!/usr/bin/env node
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import { chromium, Page, Browser } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
if (!supabaseUrl || !supabaseAnon) {
  throw new Error('Supabase env vars not set');
}

const supabase = createClient(supabaseUrl, supabaseAnon);

type ConsignmentInput = {
  status: string;
  phone_number: string | null;
  vehicle_model: string | null;
  asking_price: number | null;
  listing_url: string;
};

type ScrapedResult = {
  URL: string;
  Title: string;
  Price: string;
  Real_Phone_Number: string;
  Fake_Phone_Before: string;
  Button_Clicked: string;
  Phone_Revealed: string;
  Date_Scraped: string;
};

// SPEED OPTIMIZED: Faster car listing collection
async function findCarListings(page: Page, searchUrl: string, startingPage: number = 1): Promise<string[]> {
  console.log(`🔍 Visiting search results: ${searchUrl}`);
  console.log(`📄 Starting from page ${startingPage} (reverse round-robin strategy)`);
  
  const allCarUrls = new Set<string>();
  let pageNum = startingPage;
  
  while (true) {
    const currentUrl = pageNum === 1 ? searchUrl : `${searchUrl}&page=${pageNum}`;
    console.log(`📄 Scraping page ${pageNum}: ${currentUrl}`);
    
    try {
      // Robust navigation: give first page more time & use early commit event
      const navTimeout = pageNum === startingPage ? 90_000 : 45_000;
      await page.goto(currentUrl, { waitUntil: 'commit', timeout: navTimeout });

      // Handle Cloudflare / bot-check pages that block real content
      const cfChallenge = page.locator('text=Checking your browser').first();
      if (await cfChallenge.count()) {
        console.log('⚠️  Cloudflare challenge detected – waiting to pass…');
        try {
          await cfChallenge.waitFor({ state: 'detached', timeout: 45_000 });
          console.log('✅ Challenge cleared');
        } catch {
          console.log('❌ Challenge did not clear in time');
        }
      }
      
      // SPEED: Minimal wait
      await page.waitForTimeout(1000);
      
      // SPEED: Quick popup dismissal
      try {
        const acceptBtn = page.locator('button:has-text("Accept"), button:has-text("Don\'t Allow")');
        if (await acceptBtn.count()) {
          await acceptBtn.first().click({ timeout: 2000 });
        }
      } catch {}
      
      // SPEED: Fast scroll to load content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(500);
      
      // Extract URLs using regex (fastest method)
      const pageSource = await page.content();
      const urlPattern = /\/motors\/used-cars\/[^\/]+\/[^\/]+\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'\s>]+/g;
      const matches = pageSource.match(urlPattern) || [];
      
      const pageCarUrls = new Set<string>();
      for (const match of matches) {
        const fullUrl = match.startsWith('http') ? match : `https://dubai.dubizzle.com${match}`;
        pageCarUrls.add(fullUrl);
      }
      
      console.log(`  ✅ Found ${pageCarUrls.size} cars on page ${pageNum}`);
      
      if (pageCarUrls.size === 0) {
        console.log(`  🏁 No more cars found. Finished at page ${pageNum - 1}`);
        break;
      }
      
      // Convert Set to Array for compatibility
      Array.from(pageCarUrls).forEach(url => {
        allCarUrls.add(url);
      });
      
      // Check for next page
      const hasNext = await page.locator('a[data-testid="page-next"]:not([disabled])').count() > 0;
      
      if (!hasNext) {
        console.log(`  🏁 No active 'Next' button found. Finished at page ${pageNum}`);
        if (startingPage > 1 && pageNum > 1) {
          console.log(`  🔄 Wrapping around to page 1...`);
          pageNum = 1;
          continue;
        } else {
          break;
        }
      } else {
        pageNum++;
      }
      
      if (pageNum > 50) {
        console.log(`  ⚠️ Reached safety limit of 50 pages`);
        break;
      }
      
      if (pageNum === startingPage && allCarUrls.size > 0) {
        console.log(`  🔄 Completed full cycle`);
        break;
      }
      
    } catch (err) {
      console.log(`❌ Error on page ${pageNum}: ${err}`);
      break;
    }
  }
  
  console.log(`🎉 TOTAL FOUND: ${allCarUrls.size} individual car listings`);
  return Array.from(allCarUrls);
}

// SPEED OPTIMIZED: Faster phone extraction
async function extractPhoneAfterClick(page: Page): Promise<string | null> {
  // SPEED: Reduced wait time
  await page.waitForTimeout(1500);
  
  const phoneSelectors = [
    'a[href^="tel:"]',
    '[class*="phone"]',
    '[class*="contact"]',
    'span:has-text("+971")',
    'span:has-text("050")',
    'span:has-text("055")',
    'span:has-text("056")',
    'div:has-text("+971")'
  ];
  
  for (const selector of phoneSelectors) {
    try {
      const elements = await page.locator(selector).all();
      for (const element of elements) {
        const text = await element.textContent();
        if (text) {
          const phoneMatch = text.match(/(\+971|971|0)(50|55|56|52|54)\d{7}/);
          if (phoneMatch) {
            console.log(`📱 Found phone with selector ${selector}: ${phoneMatch[0]}`);
            return phoneMatch[0];
          }
        }
      }
    } catch {}
  }
  
  return null;
}

// SPEED OPTIMIZED: Faster call button clicking
async function findAndClickCallButton(page: Page): Promise<boolean> {
  const callButtonSelectors = [
    'button:has-text("Call")',
    'a:has-text("Call")',
    'button:has-text("اتصل")',
    'a:has-text("اتصل")',
    '[data-testid*="call"]',
    '[class*="call"]',
    'button[class*="contact"]',
    'a[class*="contact"]'
  ];
  
  for (const selector of callButtonSelectors) {
    try {
      const button = page.locator(selector).first();
      if (await button.count() > 0 && await button.isVisible()) {
        await button.click({ timeout: 3000 });
        console.log(`✅ Call button clicked: ${selector}`);
        return true;
      }
    } catch {}
  }
  
  return false;
}

// SPEED OPTIMIZED: Streamlined car processing
async function getRealPhoneNumber(page: Page, carUrl: string): Promise<ScrapedResult> {
  const result: ScrapedResult = {
    URL: carUrl,
    Title: '',
    Price: '',
    Real_Phone_Number: '',
    Fake_Phone_Before: '',
    Button_Clicked: 'No',
    Phone_Revealed: 'No',
    Date_Scraped: new Date().toISOString()
  };
  
  try {
    console.log(`🔗 Loading: ${carUrl}`);
    
    // SPEED: Fast navigation
    await page.goto(carUrl, { waitUntil: "commit", timeout: 60_000 });
    
    // SPEED: Quick data extraction
    await page.waitForTimeout(800);
    
    // Get title and price quickly
    try {
      const titleElement = await page.locator('h1, [data-testid*="title"], .listing-title').first();
      result.Title = await titleElement.textContent() || '';
    } catch {}
    
    try {
      const priceElement = await page.locator('[class*="price"], [data-testid*="price"]').first();
      const priceText = await priceElement.textContent() || '';
      result.Price = priceText.replace(/[^\d]/g, '');
    } catch {}
    
    // SPEED: Quick popup dismissal
    try {
      const popup = page.locator('button:has-text("Don\'t Allow"), button:has-text("Allow")');
      if (await popup.count()) {
        await popup.first().click({ timeout: 1000 });
      }
    } catch {}
    
    // Find and click call button
    const buttonClicked = await findAndClickCallButton(page);
    result.Button_Clicked = buttonClicked ? 'Yes' : 'No';
    
    if (buttonClicked) {
      // SPEED: Minimal wait after click
      await page.waitForTimeout(1000);
      
      // Quick popup dismissal after click
      try {
        const postClickPopup = page.locator('button:has-text("Don\'t Allow"), button:has-text("Close")');
        if (await postClickPopup.count()) {
          await postClickPopup.first().click({ timeout: 1000 });
        }
      } catch {}
      
      // Extract phone number
      const realPhone = await extractPhoneAfterClick(page);
      result.Real_Phone_Number = realPhone || '';
      result.Phone_Revealed = realPhone ? 'Yes' : 'No';
      
      if (realPhone) {
        console.log(`🎉 PHONE FOUND: ${realPhone}`);
      }
    }
    
  } catch (err) {
    console.error(`❌ Error processing ${carUrl}: ${err}`);
  }
  
  return result;
}

// SPEED OPTIMIZED: Faster duplicate check
async function isPhoneDuplicate(phoneNumber: string): Promise<boolean> {
  if (!phoneNumber) return false;
  
  const cleanedPhone = phoneNumber.replace(/[\s\-\.\(\)]/g, '');
  
  try {
    const { data } = await supabase
      .from('consignments')
      .select('phone_number')
      .eq('phone_number', cleanedPhone)
      .limit(1);
    
    return Boolean(data && data.length > 0);
  } catch {
    return false;
  }
}

const jobId = process.env.JOB_ID;

function calculateStartingPage(totalPages: number = 11): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  const startingPage = totalPages - (dayOfYear % totalPages);
  return startingPage;
}

export async function scrapeDubizzle(url: string, targetLeads: number = 20) {
  const startingPage = calculateStartingPage(11);
  
  console.log(`🚀 SPEED-OPTIMIZED SCRAPER`);
  console.log(`🎯 Goal: Get ${targetLeads} SUCCESSFUL leads with real phone numbers`);
  console.log(`🔄 Reverse Round-Robin: Starting from page ${startingPage}`);
  console.log(`⚡ SPEED MODE: Reduced delays, streamlined processing`);
  
  const browser = await chromium.launch({
    headless: false, // Keep headed for Dubizzle
    args: [
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-translate',
      '--disable-sync',
      // Keep networking alive
      '--mute-audio',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-popup-blocking',
      '--disable-web-security',
      '--window-size=1366,768',
      '--window-position=-2000,-2000',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      // Anti-throttling
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-low-res-tiling',
      '--aggressive-cache-discard'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'Asia/Dubai',
    geolocation: { latitude: 25.2048, longitude: 55.2708 },
    permissions: ['geolocation']
  });

  // Minimal stealth measures
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    (window as any).chrome = { runtime: {}, loadTimes: function() {}, csi: function() {}, app: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(30000);
  
  try {
    const carUrls = await findCarListings(page, url, startingPage);
    
    if (carUrls.length === 0) {
      console.log('❌ No car listings found');
      return;
    }
    
    console.log(`\n📋 Found ${carUrls.length} cars. Processing for ${targetLeads} leads...`);
    
    if (jobId) {
      await supabase.from('scrape_jobs').update({ total: carUrls.length }).eq('id', jobId);
    }
    
    let successfulLeads = 0;
    let carsChecked = 0;
    
    // SPEED: Reuse the same page instead of creating new ones
    for (let i = 0; i < carUrls.length && successfulLeads < targetLeads; i++) {
      const carUrl = carUrls[i];
      carsChecked++;
      
      console.log(`\n🚗 CAR ${carsChecked}/${carUrls.length} | LEADS: ${successfulLeads}/${targetLeads}`);
      
      try {
        const carData = await getRealPhoneNumber(page, carUrl);
        
        // Quick duplicate check
        if (carData.Real_Phone_Number && await isPhoneDuplicate(carData.Real_Phone_Number)) {
          console.log(`⏭️  DUPLICATE PHONE: ${carData.Real_Phone_Number}`);
          continue;
        }
        
        const dbData: ConsignmentInput = {
          status: 'new_lead',
          phone_number: carData.Real_Phone_Number || null,
          vehicle_model: carData.Title || null,
          asking_price: carData.Price ? parseInt(carData.Price.replace(/[^0-9]/g, ''), 10) || null : null,
          listing_url: carUrl,
        };
        
        if (dbData.vehicle_model && dbData.asking_price) {
          await supabase.from('consignments').insert(dbData);
          successfulLeads++;
          console.log(`✅ LEAD ${successfulLeads}: ${dbData.vehicle_model} - ${dbData.phone_number}`);
        }
        
        if (jobId) {
          await supabase.from('scrape_jobs').update({ 
            processed: carsChecked,
            successful_leads: successfulLeads 
          }).eq('id', jobId);
        }
        
        // SPEED: Minimal delay between cars (1-2 seconds instead of 6-10)
        const delay = Math.random() * 1000 + 1000; // 1-2 seconds
        console.log(`⏳ ${(delay / 1000).toFixed(1)}s delay...`);
        await page.waitForTimeout(delay);
        
      } catch (err) {
        console.error(`❌ Error with car ${carsChecked}: ${err}`);
      }
    }
    
    console.log(`\n🎉 SPEED SCRAPING COMPLETED!`);
    console.log(`📊 Results: ${successfulLeads}/${targetLeads} leads from ${carsChecked} cars`);
    console.log(`⚡ Success rate: ${((successfulLeads / carsChecked) * 100).toFixed(1)}%`);
    
    if (jobId) {
      await supabase.from('scrape_jobs').update({ 
        status: 'finished', 
        finished_at: new Date()
      }).eq('id', jobId);
    }
    
  } catch (err) {
    console.error('[scraper] Error', err);
    if (jobId) {
      await supabase.from('scrape_jobs').update({ 
        status: 'error', 
        finished_at: new Date()
      }).eq('id', jobId);
    }
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  const urlArg = process.argv[2] || 'https://dubizzle.com';
  const maxArg = parseInt(process.argv[3] || '20', 10);
  scrapeDubizzle(urlArg, maxArg).catch((err) => {
    console.error(err);
    process.exit(1);
  });
} 