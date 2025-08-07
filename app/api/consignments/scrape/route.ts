import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { supabase } from '@/lib/supabaseClient';
import { spawn } from 'child_process';
import path from 'path';

// Check if we're running in Vercel
const isVercel = process.env.VERCEL === '1';
const isDev = process.env.NODE_ENV === 'development';

// Global process tracking
let currentPythonProcess: any = null;

// Python scraper for development (enhanced functionality)
async function scrapeWithPython(url: string, targetLeads: number = 20, jobId: string) {
  console.log(`🐍 PYTHON SCRAPER (Development) - With enhanced phone extraction`);
  
  // Kill any existing Python process
  if (currentPythonProcess) {
    console.log('🔪 Killing existing Python process');
    try {
      currentPythonProcess.kill('SIGTERM');
      // Also kill any child processes
      process.kill(-currentPythonProcess.pid, 'SIGTERM');
    } catch (error) {
      console.log('⚠️ Error killing existing process:', error);
    }
    currentPythonProcess = null;
  }
  
  return new Promise((resolve, reject) => {
    // Path to Python scraper
    const pythonScriptPath = path.join(process.cwd(), 'lib', 'scraper', 'python_scraper.py');
    
    // Spawn Python process
    const pythonProcess = spawn('python3', [pythonScriptPath, jobId, url, targetLeads.toString()], {
      detached: true  // Allow us to kill the process group
    });
    
    // Track the current process
    currentPythonProcess = pythonProcess;
    
    let hasError = false;
    
    // Handle Python stdout for progress updates
    pythonProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      
      for (const line of lines) {
        if (line.trim()) {
          console.log('Raw line:', line);
          
          // Look for our progress updates
          if (line.includes('PYTHON_PROGRESS:')) {
            try {
              const jsonStr = line.split('PYTHON_PROGRESS:')[1].trim();
              const progressData = JSON.parse(jsonStr);
              
              console.log('📊 Python progress update:', progressData);
              
              // Update database with progress
              supabase.from('scrape_jobs').update({
                status: progressData.status,
                processed: progressData.processed,
                successful_leads: progressData.successful_leads,
                log: progressData.message
              }).eq('id', progressData.job_id).then(result => {
                if (result.error) {
                  console.error('❌ Error updating scrape_jobs:', result.error);
                } else {
                  console.log('✅ Updated scrape_jobs for job:', progressData.job_id);
                }
              });
              
              // If we have car data, insert it into consignments
              if (progressData.car_data && progressData.car_data.phone_number) {
                const carData = progressData.car_data;
                const dbData = {
                  status: 'new_lead',
                  phone_number: carData.phone_number,
                  vehicle_model: carData.title,
                  asking_price: carData.price ? parseInt(carData.price, 10) || null : null,
                  listing_url: carData.url,
                };
                
                // Check for duplicates before inserting
                const checkDuplicates = async () => {
                  try {
                    // Check if phone number already exists
                    const { data: phoneExists } = await supabase
                      .from('consignments')
                      .select('id, phone_number')
                      .eq('phone_number', carData.phone_number)
                      .limit(1);
                    
                    if (phoneExists && phoneExists.length > 0) {
                      console.log(`⏭️ Duplicate phone number found: ${carData.phone_number}`);
                      return;
                    }
                    
                    // Check if listing URL already exists
                    const { data: urlExists } = await supabase
                      .from('consignments')
                      .select('id, listing_url')
                      .eq('listing_url', carData.url)
                      .limit(1);
                    
                    if (urlExists && urlExists.length > 0) {
                      console.log(`⏭️ Duplicate listing URL found: ${carData.url}`);
                      return;
                    }
                    
                    // Insert new consignment if no duplicates found
                    const result = await supabase.from('consignments').insert(dbData);
                    if (result.error) {
                      // Handle database constraint violations
                      if (result.error.code === '23505') { // Unique constraint violation
                        if (result.error.message.includes('phone_number')) {
                          console.log(`⏭️ Duplicate phone number (DB constraint): ${carData.phone_number}`);
                        } else if (result.error.message.includes('listing_url')) {
                          console.log(`⏭️ Duplicate listing URL (DB constraint): ${carData.url}`);
                        } else {
                          console.log(`⏭️ Duplicate entry (DB constraint): ${result.error.message}`);
                        }
                      } else {
                        console.error('❌ Error inserting consignment:', result.error);
                      }
                    } else {
                      console.log('✅ Inserted new consignment:', carData.phone_number);
                    }
                  } catch (error) {
                    console.error('❌ Error checking duplicates:', error);
                  }
                };
                
                checkDuplicates();
              }
            } catch (error) {
              console.error('❌ Error parsing Python output:', error);
              console.error('Raw line:', line);
            }
          }
        }
      }
    });
    
    // Handle stderr (logs)
    pythonProcess.stderr.on('data', (data) => {
      console.log(`Python stderr: ${data}`);
    });
    
    // Handle process completion
    pythonProcess.on('close', async (code) => {
      // Clear the current process reference
      if (currentPythonProcess === pythonProcess) {
        currentPythonProcess = null;
      }
      
      if (code !== 0 && !hasError) {
        hasError = true;
        await supabase.from('scrape_jobs').update({
          status: 'error',
          finished_at: new Date(),
          log: `Python process exited with code ${code}`
        }).eq('id', jobId);
        reject(new Error(`Python process exited with code ${code}`));
      } else if (!hasError) {
        resolve(undefined);
      }
    });
    
    // Handle process error
    pythonProcess.on('error', async (error) => {
      if (!hasError) {
        hasError = true;
        await supabase.from('scrape_jobs').update({
          status: 'error',
          finished_at: new Date(),
          log: `Python process error: ${error.message}`
        }).eq('id', jobId);
        reject(error);
      }
    });
    
    // Set initial status
    supabase.from('scrape_jobs').update({
      status: 'running',
      log: 'Starting Python scraper...'
    }).eq('id', jobId);
  });
}

// Simple scraper that works in Vercel (limited functionality)
async function scrapeBasicInfo(url: string, targetLeads: number = 20, jobId: string) {
  console.log(`🔍 BASIC SCRAPER (Vercel) - Limited to public info only`);
  
  try {
    await supabase.from('scrape_jobs').update({ 
      status: 'running',
      log: 'Running basic scraper (Vercel environment - no phone extraction)'
    }).eq('id', jobId);

    // Use simple HTTP fetch instead of browser automation
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Extract car URLs using regex
    const urlPattern = /\/motors\/used-cars\/[^\/]+\/[^\/]+\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'\s>]+/g;
    const matches = html.match(urlPattern) || [];
    
    const carUrls = Array.from(new Set(matches.map(match => 
      match.startsWith('http') ? match : `https://dubai.dubizzle.com${match}`
    )));

    console.log(`📋 Found ${carUrls.length} cars (basic extraction)`);
    
    if (carUrls.length === 0) {
      await supabase.from('scrape_jobs').update({ 
        status: 'error',
        finished_at: new Date(),
        log: 'No car listings found in HTML'
      }).eq('id', jobId);
      return;
    }

    await supabase.from('scrape_jobs').update({ 
      total: carUrls.length,
      log: `Found ${carUrls.length} cars. Note: Phone extraction not available in Vercel environment`
    }).eq('id', jobId);

    let successfulLeads = 0;
    const maxCarsToProcess = Math.min(carUrls.length, 5); // Even more limited for basic scraper
    
    // Process cars with basic info only (no phone numbers)
    for (let i = 0; i < maxCarsToProcess; i++) {
      const carUrl = carUrls[i];
      
      try {
        const carResponse = await fetch(carUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        if (carResponse.ok) {
          const carHtml = await carResponse.text();
          
          // Extract basic info using regex
          const titleMatch = carHtml.match(/<h1[^>]*>([^<]+)<\/h1>/i);
          const priceMatch = carHtml.match(/AED\s*([\d,]+)/i);
          
          const title = titleMatch ? titleMatch[1].trim() : '';
          const priceText = priceMatch ? priceMatch[1].replace(/,/g, '') : '';
          const price = priceText ? parseInt(priceText, 10) : null;
          
          if (title && price) {
            const dbData = {
              status: 'new_lead',
              phone_number: null, // No phone extraction in basic mode
              vehicle_model: title,
              asking_price: price,
              listing_url: carUrl,
            };
            
            await supabase.from('consignments').insert(dbData);
            successfulLeads++;
            console.log(`✅ Basic Lead ${successfulLeads}: ${title} - AED ${price} (No phone)`);
          }
        }
        
        await supabase.from('scrape_jobs').update({ 
          processed: i + 1,
          successful_leads: successfulLeads,
          log: `Processed ${i + 1} cars (basic mode - no phone extraction)`
        }).eq('id', jobId);
        
      } catch (err) {
        console.error(`❌ Error processing car ${i + 1}: ${err}`);
      }
    }
    
    await supabase.from('scrape_jobs').update({ 
      status: 'finished',
      finished_at: new Date(),
      log: `Completed basic scraping: ${successfulLeads} leads (no phone numbers - Vercel limitation)`
    }).eq('id', jobId);
    
    console.log(`🎉 Basic scraping completed: ${successfulLeads} leads without phone numbers`);
    
  } catch (error: any) {
    console.error('Basic scraper error:', error);
    
    await supabase.from('scrape_jobs').update({ 
      status: 'error',
      finished_at: new Date(),
      log: `Basic scraper error: ${error.message}`
    }).eq('id', jobId);
    
    throw error;
  }
}

// Full scraper with browser automation (for local development)
async function scrapeWithBrowser(url: string, targetLeads: number = 20, jobId: string) {
  console.log(`🚀 FULL SCRAPER (Local) - With phone extraction`);
  
  try {
    await supabase.from('scrape_jobs').update({ 
      status: 'running',
      log: 'Running full scraper with browser automation'
    }).eq('id', jobId);

    // @ts-ignore - Playwright is an optional dev-only dependency; not installed on Vercel
    const playwright = await import('playwright');
    const { chromium } = playwright;

    const browser = await chromium.launch({
      headless: false, // Required for Dubizzle
      args: [
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 }
    });

    const page = await context.newPage();
    
    // Navigate to search page
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    
    // Extract car URLs
    const pageSource = await page.content();
    const urlPattern = /\/motors\/used-cars\/[^\/]+\/[^\/]+\/\d{4}\/\d{1,2}\/\d{1,2}\/[^"'\s>]+/g;
    const matches = (pageSource.match(urlPattern) ?? []) as string[];

    const carUrls = Array.from(new Set(matches.map((match: string) => 
      match.startsWith('http') ? match : `https://dubai.dubizzle.com${match}`
    )));

    console.log(`📋 Found ${carUrls.length} cars (full extraction)`);
    
    if (carUrls.length === 0) {
      await browser.close();
      await supabase.from('scrape_jobs').update({ 
        status: 'error',
        finished_at: new Date(),
        log: 'No car listings found'
      }).eq('id', jobId);
      return;
    }

    await supabase.from('scrape_jobs').update({ 
      total: carUrls.length,
      log: `Found ${carUrls.length} cars, extracting phone numbers...`
    }).eq('id', jobId);

    let successfulLeads = 0;
    const maxCarsToProcess = Math.min(carUrls.length, 10);
    
    // Process cars with full phone extraction
    for (let i = 0; i < maxCarsToProcess && successfulLeads < targetLeads; i++) {
      const carUrl = carUrls[i];
      
      try {
        await page.goto(carUrl, { waitUntil: 'domcontentloaded' });
        
        // Extract basic info
        let title = '';
        let price = '';
        let phoneNumber = '';
        
        try {
          const titleElement = await page.locator('h1').first();
          title = await titleElement.textContent() || '';
        } catch {}
        
        try {
          const priceElement = await page.locator('[class*="price"]').first();
          const priceText = await priceElement.textContent() || '';
          price = priceText.replace(/[^\d]/g, '');
        } catch {}

        // Try to extract phone number
        try {
          const callButton = page.locator('button:has-text("Call"), a:has-text("Call")').first();
          if (await callButton.count() > 0) {
            await callButton.click();
            await page.waitForTimeout(2000);
            
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

        // Save to database
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
          console.log(`✅ Full Lead ${successfulLeads}: ${title} - ${phoneNumber || 'No phone'}`);
        }
        
        await supabase.from('scrape_jobs').update({ 
          processed: i + 1,
          successful_leads: successfulLeads,
          log: `Processed ${i + 1} cars, found ${successfulLeads} leads with phone numbers`
        }).eq('id', jobId);
        
        await page.waitForTimeout(1000);
        
      } catch (err) {
        console.error(`❌ Error processing car ${i + 1}: ${err}`);
      }
    }
    
    await browser.close();
    
    await supabase.from('scrape_jobs').update({ 
      status: 'finished',
      finished_at: new Date(),
      log: `Completed full scraping: ${successfulLeads} leads with phone numbers`
    }).eq('id', jobId);
    
    console.log(`🎉 Full scraping completed: ${successfulLeads} leads with phone numbers`);
    
  } catch (error: any) {
    console.error('Full scraper error:', error);
    
    await supabase.from('scrape_jobs').update({ 
      status: 'error',
      finished_at: new Date(),
      log: `Full scraper error: ${error.message}`
    }).eq('id', jobId);
    
    throw error;
  }
}

export async function POST(req: Request) {
  const { url, max } = await req.json();
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  // Check if a Python process is already running
  if (isDev && currentPythonProcess) {
    console.log('⚠️ Python scraper already running, rejecting new request');
    return NextResponse.json({ error: 'Scraper already running. Please stop the current scraper first.' }, { status: 409 });
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

    // Choose scraper based on environment
    if (isVercel) {
      console.log('🔧 Running in Vercel - using basic scraper (no phone extraction)');
      await scrapeBasicInfo(url, max ?? 20, id);
    } else if (isDev) {
      console.log('🔧 Running in development - using Python scraper with enhanced phone extraction');
      // Don't await - let Python run in background
      scrapeWithPython(url, max ?? 20, id).catch(error => {
        console.error('Python scraper error:', error);
      });
    } else {
      console.log('🔧 Running locally - using full scraper with phone extraction');
      await scrapeWithBrowser(url, max ?? 20, id);
    }

    return NextResponse.json({ jobId: id }, { status: 202 });
    
  } catch (error: any) {
    console.error('API error:', error);
    
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

export async function DELETE(req: Request) {
  console.log('🛑 STOP request received');
  
  // Kill the current Python process if it exists
  if (currentPythonProcess) {
    console.log('🔪 Killing Python process:', currentPythonProcess.pid);
    try {
      // Kill the process group to ensure all child processes are killed
      process.kill(-currentPythonProcess.pid, 'SIGTERM');
      currentPythonProcess = null;
      console.log('✅ Python process killed successfully');
    } catch (error) {
      console.log('⚠️ Error killing Python process:', error);
    }
  } else {
    console.log('ℹ️ No Python process to kill');
  }
  
  // Also kill any remaining python processes that might be running
  try {
    const { spawn } = require('child_process');
    spawn('pkill', ['-f', 'python_scraper.py']);
    console.log('🔪 Killed any remaining python_scraper.py processes');
  } catch (error) {
    console.log('⚠️ Error killing remaining processes:', error);
  }
  
  return NextResponse.json({ message: 'Scraper stopped' }, { status: 200 });
} 