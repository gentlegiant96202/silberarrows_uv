import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Serve static files from public directory (for SVG files, fonts, etc.)
app.use(express.static(path.resolve(__dirname, '../public')));

const templatePath = path.resolve(__dirname, '../public/templates/price-drop-template.html');
const template45Path = path.resolve(__dirname, '../public/templates/price-drop-template-45.html');
const catalogTemplatePath = path.resolve(__dirname, '../public/templates/xml-catalog-template.html');
const leasingCatalogTemplatePath = path.resolve(__dirname, '../public/templates/leasing-catalog-template.html');
const leasingCatalogAltTemplatePath = path.resolve(__dirname, '../public/templates/leasing-catalog-alt-template.html');
const consignmentTemplatePath = path.resolve(__dirname, '../public/templates/consignment-agreement-template.html');
const damageReportTemplatePath = path.resolve(__dirname, '../public/templates/damage-report-template.html');

// Content pillar templates
const contentPillarTemplates = {
  monday: path.resolve(__dirname, '../public/templates/content-pillar-monday.html'),
  tuesday: path.resolve(__dirname, '../public/templates/content-pillar-tuesday.html'),
  wednesday: path.resolve(__dirname, '../public/templates/content-pillar-wednesday.html'),
  thursday: path.resolve(__dirname, '../public/templates/content-pillar-thursday.html'),
  friday: path.resolve(__dirname, '../public/templates/content-pillar-friday.html'),
  saturday: path.resolve(__dirname, '../public/templates/content-pillar-saturday.html'),
  sunday: path.resolve(__dirname, '../public/templates/content-pillar-sunday.html')
};

let templateHtml = '';
let template45Html = '';
let catalogTemplateHtml = '';
let leasingCatalogTemplateHtml = '';
let leasingCatalogAltTemplateHtml = '';
let consignmentTemplateHtml = '';
let damageReportTemplateHtml = '';
let mainLogoBase64 = '';
let leasingBgBase64 = '';
let resonateFontsBase64 = {};
let contentPillarHtmls = {};

async function loadTemplate() {
  try {
    templateHtml = await fs.readFile(templatePath, 'utf-8');
  } catch (err) {
    throw err;
  }
  
  try {
    template45Html = await fs.readFile(template45Path, 'utf-8');
  } catch (err) {
    throw err;
  }
  
  try {
    catalogTemplateHtml = await fs.readFile(catalogTemplatePath, 'utf-8');
  } catch (err) {
    throw err;
  }
  
  try {
    leasingCatalogTemplateHtml = await fs.readFile(leasingCatalogTemplatePath, 'utf-8');
  } catch (err) {
    throw err;
  }
  
  try {
    leasingCatalogAltTemplateHtml = await fs.readFile(leasingCatalogAltTemplatePath, 'utf-8');
  } catch (err) {
    throw err;
  }
  
  try {
    consignmentTemplateHtml = await fs.readFile(consignmentTemplatePath, 'utf-8');
  } catch (err) {
    throw err;
  }
  
  
  try {
    damageReportTemplateHtml = await fs.readFile(damageReportTemplatePath, 'utf-8');
  } catch (err) {
    damageReportTemplateHtml = ''; // Don't fail startup
  }
  
  // Load main logo as base64 at startup
  try {
    const logoPath = path.resolve(__dirname, '../public/main-logo.png');
    const logoBuffer = await fs.readFile(logoPath);
    mainLogoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    // Fallback to original logo
    mainLogoBase64 = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';
  }
  
  // Load leasing catalog background image as base64
  try {
    const bgPath = path.resolve(__dirname, '../public/assets/images/Artboard 7 copy 3.png');
    const bgBuffer = await fs.readFile(bgPath);
    leasingBgBase64 = `data:image/png;base64,${bgBuffer.toString('base64')}`;
  } catch (error) {
    leasingBgBase64 = '#ffffff'; // Fallback to white
  }
  
  // Load Resonate fonts as base64 for leasing catalog templates
  try {
    const fontWeights = {
      'Black': '900',
      'Bold': '700',
      'Medium': '500',
      'Regular': '400',
      'Light': '300'
    };
    
    for (const [weight, value] of Object.entries(fontWeights)) {
      const fontPath = path.resolve(__dirname, `../public/Fonts/Resonate-${weight}.woff2`);
      const fontBuffer = await fs.readFile(fontPath);
      resonateFontsBase64[weight] = `data:font/woff2;base64,${fontBuffer.toString('base64')}`;
    }
  } catch (error) {
  }
  
  // Load content pillar templates
  for (const [day, templatePath] of Object.entries(contentPillarTemplates)) {
    try {
      contentPillarHtmls[day] = await fs.readFile(templatePath, 'utf-8');
    } catch (err) {
      throw err;
    }
  }
  }

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

function fillTemplate({ carDetails, pricing, firstImageUrl, secondImageUrl }) {
  let html = templateHtml;
  
  // Handle mileage - if it's "N/A" or empty, show "N/A"
  const mileageDisplay = carDetails.mileage && carDetails.mileage !== 'N/A' && carDetails.mileage.trim() !== '' 
    ? carDetails.mileage 
    : 'N/A';
    
  // Handle horsepower - if it's null, undefined, or empty, show 'N/A'
  const horsepowerDisplay = carDetails.horsepower && carDetails.horsepower !== null && carDetails.horsepower !== '' 
    ? String(carDetails.horsepower)
    : 'N/A';
  const primaryImage = String(firstImageUrl ?? '');
  const secondaryImage = String(secondImageUrl ?? firstImageUrl ?? '');

  const replacements = {
    '{{year}}': String(carDetails.year ?? ''),
    '{{model}}': String(carDetails.model ?? ''),
    '{{mileage}}': mileageDisplay,
    '{{horsepower}}': horsepowerDisplay,
    '{{stockNumber}}': String(carDetails.stockNumber ?? ''),
    '{{wasPrice}}': Number(pricing.wasPrice ?? 0).toLocaleString(),
    '{{nowPrice}}': Number(pricing.nowPrice ?? 0).toLocaleString(),
    '{{savings}}': Number(pricing.savings ?? 0).toLocaleString(),
    '{{monthlyPayment}}': pricing.isCashOnly ? 'CASH ONLY' : `From AED ${Number(pricing.monthlyPayment ?? 0).toLocaleString()}/mo`,
    '{{carImageUrl1}}': primaryImage,
    '{{carImageUrl2}}': secondaryImage,
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
  }
  return html;
}

function fillTemplate45({ carDetails, pricing, firstImageUrl, secondImageUrl }) {
  let html = template45Html;
  
  // Handle mileage - if it's "N/A" or empty, show "N/A"
  const mileageDisplay = carDetails.mileage && carDetails.mileage !== 'N/A' && carDetails.mileage.trim() !== '' 
    ? carDetails.mileage 
    : 'N/A';
    
  // Handle horsepower - if it's null, undefined, or empty, show 'N/A'
  const horsepowerDisplay = carDetails.horsepower && carDetails.horsepower !== null && carDetails.horsepower !== '' 
    ? String(carDetails.horsepower)
    : 'N/A';
  
  const primaryImage = String(firstImageUrl ?? '');
  const secondaryImage = String(secondImageUrl ?? firstImageUrl ?? '');

  const replacements = {
    '{{year}}': String(carDetails.year ?? ''),
    '{{model}}': String(carDetails.model ?? ''),
    '{{mileage}}': mileageDisplay,
    '{{horsepower}}': horsepowerDisplay,
    '{{stockNumber}}': String(carDetails.stockNumber ?? ''),
    '{{wasPrice}}': Number(pricing.wasPrice ?? 0).toLocaleString(),
    '{{nowPrice}}': Number(pricing.nowPrice ?? 0).toLocaleString(),
    '{{savings}}': Number(pricing.savings ?? 0).toLocaleString(),
    '{{monthlyPayment}}': pricing.isCashOnly ? 'CASH ONLY' : `From AED ${Number(pricing.monthlyPayment ?? 0).toLocaleString()}/mo`,
    '{{carImageUrl1}}': primaryImage,
    '{{carImageUrl2}}': secondaryImage,
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
  }
  return html;
}

function fillCatalogTemplate({ carDetails, catalogImageUrl }) {
  // No discount calculations - use original prices and payments from database
  
  let html = catalogTemplateHtml;
  const replacements = {
    '{{year}}': String(carDetails.year ?? ''),
    '{{model}}': String(carDetails.model ?? ''),
    '{{mileage}}': String(carDetails.mileage ?? ''),
    '{{stockNumber}}': String(carDetails.stockNumber ?? ''),
    '{{price}}': String(carDetails.price ?? ''),
    '{{catalogImageUrl}}': String(catalogImageUrl ?? ''),
    '{{originalPrice}}': String(carDetails.originalPrice ?? carDetails.price ?? '—'),
    '{{zeroDownPayment}}': String(carDetails.zeroDownPayment ?? '—'),
    '{{twentyDownPayment}}': String(carDetails.twentyDownPayment ?? '—'),
    '{{horsepower}}': String(carDetails.horsepower ?? '—'),
    '{{regionalSpecification}}': String(carDetails.regionalSpecification ?? '—').replace(/\s*SPECIFICATION/i, ''),
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
  }
  return html;
}

function fillLeasingCatalogTemplate({ carDetails, catalogImageUrl }) {
  // Leasing-specific template with 1:1 square ratio
  
  let html = leasingCatalogTemplateHtml;
  const replacements = {
    '{{year}}': String(carDetails.year ?? ''),
    '{{model}}': String(carDetails.model ?? ''),
    '{{catalogImageUrl}}': String(catalogImageUrl ?? ''),
    '{{originalPrice}}': String(carDetails.originalPrice ?? '—'),
    '{{mileage}}': String(carDetails.mileage ?? ''),
    '{{regionalSpecification}}': String(carDetails.regionalSpecification ?? 'GCC'),
    '{{stockNumber}}': String(carDetails.stockNumber ?? ''),
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
  }
  
  // Replace logo reference with base64 data URL
  html = replaceAll(html, '/main-logo.png', mainLogoBase64);
  
  // Replace background image with base64 data URL
  html = replaceAll(html, '{{leasingBgBase64}}', leasingBgBase64);
  // Replace font URLs with base64 data URLs
  if (resonateFontsBase64.Black) {
    html = replaceAll(html, "url('/Fonts/Resonate-Black.woff2')", `url('${resonateFontsBase64.Black}')`);
  }
  if (resonateFontsBase64.Bold) {
    html = replaceAll(html, "url('/Fonts/Resonate-Bold.woff2')", `url('${resonateFontsBase64.Bold}')`);
  }
  if (resonateFontsBase64.Medium) {
    html = replaceAll(html, "url('/Fonts/Resonate-Medium.woff2')", `url('${resonateFontsBase64.Medium}')`);
  }
  if (resonateFontsBase64.Regular) {
    html = replaceAll(html, "url('/Fonts/Resonate-Regular.woff2')", `url('${resonateFontsBase64.Regular}')`);
  }
  if (resonateFontsBase64.Light) {
    html = replaceAll(html, "url('/Fonts/Resonate-Light.woff2')", `url('${resonateFontsBase64.Light}')`);
  }
  
  return html;
}

function fillLeasingCatalogAltTemplate({ carDetails }) {
  // Alternative leasing template - text-focused without car image
  
  let html = leasingCatalogAltTemplateHtml;
  const replacements = {
    '{{year}}': String(carDetails.year ?? ''),
    '{{model}}': String(carDetails.model ?? ''),
    '{{originalPrice}}': String(carDetails.originalPrice ?? '—'),
    '{{mileage}}': String(carDetails.mileage ?? ''),
    '{{regionalSpecification}}': String(carDetails.regionalSpecification ?? 'GCC'),
    '{{stockNumber}}': String(carDetails.stockNumber ?? ''),
    '{{heroImageUrl}}': String(carDetails.heroImageUrl ?? 'https://database.silberarrows.com/storage/v1/object/public/media-files/hero-bg-silver-optimized.jpg'),
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
  }
  
  // Replace logo reference with base64 data URL
  html = replaceAll(html, '/main-logo.png', mainLogoBase64);
  
  // Replace background image with base64 data URL
  html = replaceAll(html, '{{leasingBgBase64}}', leasingBgBase64);
  // Replace font URLs with base64 data URLs
  if (resonateFontsBase64.Black) {
    html = replaceAll(html, "url('/Fonts/Resonate-Black.woff2')", `url('${resonateFontsBase64.Black}')`);
  }
  if (resonateFontsBase64.Bold) {
    html = replaceAll(html, "url('/Fonts/Resonate-Bold.woff2')", `url('${resonateFontsBase64.Bold}')`);
  }
  if (resonateFontsBase64.Medium) {
    html = replaceAll(html, "url('/Fonts/Resonate-Medium.woff2')", `url('${resonateFontsBase64.Medium}')`);
  }
  if (resonateFontsBase64.Regular) {
    html = replaceAll(html, "url('/Fonts/Resonate-Regular.woff2')", `url('${resonateFontsBase64.Regular}')`);
  }
  if (resonateFontsBase64.Light) {
    html = replaceAll(html, "url('/Fonts/Resonate-Light.woff2')", `url('${resonateFontsBase64.Light}')`);
  }
  
  return html;
}

function fillContentPillarTemplate({ title, description, imageUrl, dayOfWeek, badgeText, subtitle, myth, fact, problem, solution, difficulty, tools_needed, warning }) {
  const day = dayOfWeek.toLowerCase();
  if (!contentPillarHtmls[day]) {
    throw new Error(`Template not found for day: ${day}`);
  }
  
  let html = contentPillarHtmls[day];
  
  // Basic replacements for all templates
  const replacements = {
    '{{title}}': String(title ?? ''),
    '{{description}}': String(description ?? ''),
    '{{imageUrl}}': String(imageUrl ?? ''),
    '{{badgeText}}': String(badgeText ?? dayOfWeek.toUpperCase()),
    '{{badge_text}}': String(badgeText ?? dayOfWeek.toUpperCase()), // Alternative naming
    '{{subtitle}}': String(subtitle ?? 'Premium Selection'),
    
    // Extended fields for Tuesday (Tech Tips) template
    '{{myth}}': String(myth ?? ''),
    '{{fact}}': String(fact ?? ''),
    '{{problem}}': String(problem ?? ''),
    '{{solution}}': String(solution ?? ''),
    '{{difficulty}}': String(difficulty ?? ''),
    '{{tools_needed}}': String(tools_needed ?? ''),
    '{{warning}}': String(warning ?? ''),
  };
  
  // Handle basic replacements
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
  }
  
  // Handle conditional sections for Tuesday template (simplified Handlebars-like logic)
  if (day === 'tuesday') {
    // Handle {{#if problem}} sections
    html = handleConditionalSection(html, 'problem', problem);
    html = handleConditionalSection(html, 'solution', solution);
    html = handleConditionalSection(html, 'warning', warning);
    
    // Handle nested conditionals for difficulty and tools_needed
    const hasBothDifficultyAndTools = difficulty && tools_needed;
    html = handleNestedConditional(html, 'difficulty', 'tools_needed', hasBothDifficultyAndTools);
  }
  
  return html;
}

// Helper function to handle conditional sections
function handleConditionalSection(html, fieldName, fieldValue) {
  const ifPattern = new RegExp(`\\{\\{#if ${fieldName}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'g');
  
  if (fieldValue && fieldValue.trim()) {
    // Keep the content, remove the conditional tags
    html = html.replace(ifPattern, '$1');
  } else {
    // Remove the entire conditional block
    html = html.replace(ifPattern, '');
  }
  
  return html;
}

// Helper function to handle nested conditionals
function handleNestedConditional(html, field1, field2, shouldShow) {
  const nestedPattern = new RegExp(`\\{\\{#if ${field1}\\}\\}\\{\\{#if ${field2}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}\\{\\{/if\\}\\}`, 'g');
  
  if (shouldShow) {
    // Keep the content, remove the conditional tags
    html = html.replace(nestedPattern, '$1');
  } else {
    // Remove the entire conditional block
    html = html.replace(nestedPattern, '');
  }
  
  return html;
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/render', async (req, res) => {
  try {
    const { carDetails, pricing, firstImageUrl, secondImageUrl } = req.body || {};
    if (!carDetails || !pricing || !firstImageUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    const storyHtml = fillTemplate({ carDetails, pricing, firstImageUrl, secondImageUrl });
    const postHtml = fillTemplate45({ carDetails, pricing, firstImageUrl, secondImageUrl });
    // Prefer Playwright; it exists in this image
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    // Story 9:16
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.setContent(storyHtml, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(800);
    const storyBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    // 4:5
    await page.setViewportSize({ width: 1080, height: 1350 });
    await page.setContent(postHtml, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(400);
    const postBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    await browser.close();
    const image45 = postBuffer.toString('base64');
    const imageStory = storyBuffer.toString('base64');

    res.json({ success: true, image45, imageStory });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.post('/render-catalog', async (req, res) => {
  try {
    const { carDetails, catalogImageUrl } = req.body || {};
    if (!carDetails || !catalogImageUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields: carDetails and catalogImageUrl' });
    }
    const html = fillCatalogTemplate({ carDetails, catalogImageUrl });
    // Prefer Playwright; it exists in this image
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // 1:1 square aspect ratio for catalog (3000x3000)
    await page.setViewportSize({ width: 3000, height: 3000 });
    
    // Set shorter timeout and don't wait for network idle for external images
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Enhanced font loading like content pillars
    try {
      await page.evaluate(() => document.fonts && document.fonts.ready);
      // Force load Resonate fonts specifically
      await page.evaluate(() => {
        const resonateTest = document.createElement('div');
        resonateTest.style.fontFamily = 'Resonate, Arial, sans-serif';
        resonateTest.style.fontSize = '68px';
        resonateTest.style.fontWeight = '900';
        resonateTest.style.position = 'absolute';
        resonateTest.style.left = '-9999px';
        resonateTest.innerHTML = 'Resonate Font Test';
        document.body.appendChild(resonateTest);
        resonateTest.offsetHeight;
        document.body.removeChild(resonateTest);
      });
      await page.waitForTimeout(3000);
    } catch (e) {
    }
    
    // Capture the card element itself to guarantee exact 3000x3000 output
    const cardEl = await page.$('.catalog-card-container');
    const catalogBuffer = await cardEl.screenshot({ type: 'png' });

    await browser.close();

    const catalogImage = catalogBuffer.toString('base64');

    res.json({ success: true, catalogImage });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.post('/render-leasing-catalog', async (req, res) => {
  try {
    const { carDetails, catalogImageUrl } = req.body || {};
    if (!carDetails || !catalogImageUrl) {
      return res.status(400).json({ success: false, error: 'Missing required fields: carDetails and catalogImageUrl' });
    }
    const html = fillLeasingCatalogTemplate({ carDetails, catalogImageUrl });
    // Prefer Playwright; it exists in this image
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // 1:1 aspect ratio for leasing catalog (2400x2400)
    await page.setViewportSize({ width: 2400, height: 2400 });
    
    // Wait for network to be idle to ensure all resources load
        await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
        
        // Wait for resources with increased timeout
        try {
            // Give extra time for fonts to load
            await page.waitForTimeout(3000);
            
            // Wait for fonts with timeout
            await Promise.race([
                page.evaluate(() => document.fonts && document.fonts.ready),
                new Promise(resolve => setTimeout(resolve, 5000))
            ]);
            
            // Wait for images (including logo) with timeout
            await Promise.race([
                page.evaluate(() => {
                    return Promise.all(
                        Array.from(document.images)
                            .filter(img => !img.complete)
                            .map(img => new Promise(resolve => {
                                img.onload = img.onerror = resolve;
                                // Fallback timeout for each image
                                setTimeout(resolve, 3000);
                            }))
                    );
                }),
                new Promise(resolve => setTimeout(resolve, 5000))
            ]);
            
            // Force Resonate font rendering
            await page.evaluate(() => {
                const test = document.createElement('div');
                test.style.fontFamily = 'Resonate, Impact, sans-serif';
                test.style.fontWeight = '900';
                test.style.fontSize = '100px';
                test.style.position = 'absolute';
                test.style.left = '-9999px';
                test.innerHTML = 'RENT-TO-OWN';
                document.body.appendChild(test);
                test.offsetHeight; // Force layout
                document.body.removeChild(test);
            });
            
            await page.waitForTimeout(2000);
        } catch (e) {
        }
    
    // Capture the ad container element for exact 2400x2400 output
    const cardEl = await page.$('.ad-container');
    const catalogBuffer = await cardEl.screenshot({ type: 'png' });

    await browser.close();

    const catalogImage = catalogBuffer.toString('base64');

    res.json({ success: true, catalogImage });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.post('/render-leasing-catalog-alt', async (req, res) => {
  try {
    const { carDetails } = req.body || {};
    if (!carDetails) {
      return res.status(400).json({ success: false, error: 'Missing required field: carDetails' });
    }
    const html = fillLeasingCatalogAltTemplate({ carDetails });
    // Prefer Playwright
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // 1:1 aspect ratio for leasing catalog alt (2400x2400)
    await page.setViewportSize({ width: 2400, height: 2400 });
    
    // Wait for network to be idle to ensure all resources load
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Wait for resources with increased timeout
    try {
      // Give extra time for fonts to load
      await page.waitForTimeout(3000);
      
      // Wait for fonts with timeout
      await Promise.race([
        page.evaluate(() => document.fonts && document.fonts.ready),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      
      // Wait for images (including logo and hero image) with timeout
      await Promise.race([
        page.evaluate(() => {
          return Promise.all(
            Array.from(document.images)
              .filter(img => !img.complete)
              .map(img => new Promise(resolve => {
                img.onload = img.onerror = resolve;
                // Fallback timeout for each image
                setTimeout(resolve, 3000);
              }))
          );
        }),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      
      // Force Resonate font rendering
      await page.evaluate(() => {
        const test = document.createElement('div');
        test.style.fontFamily = 'Resonate, Impact, sans-serif';
        test.style.fontWeight = '900';
        test.style.fontSize = '100px';
        test.style.position = 'absolute';
        test.style.left = '-9999px';
        test.innerHTML = 'RENT-TO-OWN';
        document.body.appendChild(test);
        test.offsetHeight; // Force layout
        document.body.removeChild(test);
      });
      
      await page.waitForTimeout(2000);
    } catch (e) {
    }
    
    // Capture the ad container element for exact 2400x2400 output
    const cardEl = await page.$('.ad-container');
    const catalogBuffer = await cardEl.screenshot({ type: 'png' });

    await browser.close();

    const catalogImage = catalogBuffer.toString('base64');

    res.json({ success: true, catalogImage });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.post('/render-content-pillar', async (req, res) => {
  try {
    const { 
      title, description, imageUrl, dayOfWeek, badgeText, subtitle,
      myth, fact, problem, solution, difficulty, tools_needed, warning 
    } = req.body || {};
    if (!title || !description || !imageUrl || !dayOfWeek) {
      return res.status(400).json({ success: false, error: 'Missing required fields: title, description, imageUrl, dayOfWeek' });
    }
    const html = fillContentPillarTemplate({ 
      title, description, imageUrl, dayOfWeek, badgeText, subtitle,
      myth, fact, problem, solution, difficulty, tools_needed, warning 
    });
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        // Instagram story format (1080x1920)
        await page.setViewportSize({ width: 1080, height: 1920 });
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await page.waitForTimeout(1000);
        const imageBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    await browser.close();
    const contentPillarImage = imageBuffer.toString('base64');

    res.json({ success: true, contentPillarImage });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// New endpoint to render from provided HTML directly
app.post('/render-html', async (req, res) => {
  try {
    const { html, dayOfWeek } = req.body;
    if (!html || !dayOfWeek) {
      return res.status(400).json({ success: false, error: 'Missing html or dayOfWeek' });
    }
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    // Instagram story format (1080x1920)
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Use Google Fonts which load reliably in headless browsers
    
    // Wait for fonts and images to load
    await page.evaluate(() => document.fonts && document.fonts.ready);
    
    // Check if images (including SVGs) are loading
    const imageInfo = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }));
    });
    // Check if fonts are loaded
    const fontInfo = await page.evaluate(() => {
      const fonts = [];
      if (document.fonts) {
        document.fonts.forEach(font => {
          fonts.push({
            family: font.family,
            status: font.status,
            loaded: font.status === 'loaded'
          });
        });
      }
      return {
        totalFonts: fonts.length,
        loadedFonts: fonts.filter(f => f.loaded).length,
        resonateFonts: fonts.filter(f => f.family.includes('Resonate')),
        uaeSymbolFonts: fonts.filter(f => f.family.includes('UAESymbol')),
        allFonts: fonts
      };
    });
    // Force font loading by applying styles
    await page.evaluate(() => {
      // Create a hidden element to force font loading
      const testElement = document.createElement('div');
      testElement.style.fontFamily = 'Resonate, Inter, Arial, sans-serif';
      testElement.style.fontSize = '68px';
      testElement.style.fontWeight = '900';
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.innerHTML = 'Font Loading Test';
      document.body.appendChild(testElement);
      
      // Force layout calculation
      testElement.offsetHeight;
      
      // Remove test element
      document.body.removeChild(testElement);
    });
    
    // Force load UAESymbol font specifically
    await page.evaluate(() => {
      // Create test elements for both Resonate and UAESymbol fonts
      const resonateTest = document.createElement('div');
      resonateTest.style.fontFamily = 'Resonate, Inter, Arial, sans-serif';
      resonateTest.style.fontSize = '68px';
      resonateTest.style.fontWeight = '900';
      resonateTest.style.position = 'absolute';
      resonateTest.style.left = '-9999px';
      resonateTest.innerHTML = 'Resonate Font Test';
      document.body.appendChild(resonateTest);
      
      const uaeTest = document.createElement('div');
      uaeTest.style.fontFamily = 'UAESymbol, Arial, sans-serif';
      uaeTest.style.fontSize = '24px';
      uaeTest.style.fontWeight = 'bold';
      uaeTest.style.position = 'absolute';
      uaeTest.style.left = '-9999px';
      uaeTest.innerHTML = '&#xea;'; // The Dirham symbol
      document.body.appendChild(uaeTest);
      
      // Force layout calculations
      resonateTest.offsetHeight;
      uaeTest.offsetHeight;
      
      // Remove test elements
      document.body.removeChild(resonateTest);
      document.body.removeChild(uaeTest);
    });
    
    await page.waitForTimeout(7000); // Give extra time for custom fonts to load
    const imageBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    await browser.close();
    const contentPillarImage = imageBuffer.toString('base64');

    res.json({ success: true, contentPillarImage });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// NEW: PDF generation endpoint (separate from existing functions)
app.post('/render-car-pdf', async (req, res) => {
  try {
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({ success: false, error: 'Missing HTML content' });
    }
    // Launch Playwright for PDF generation
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    // Set content and wait for everything to load
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Wait for fonts and images to load
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(3000); // Give extra time for images
    // Generate PDF with proper settings
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '0.5in', 
        bottom: '0.5in', 
        left: '0.5in', 
        right: '0.5in' 
      },
      timeout: 60000 // 60 second timeout for PDF generation
    });

    await browser.close();
    // Return PDF as base64 for upload to Supabase
    const pdfBase64 = pdf.toString('base64');
    res.json({ 
      success: true, 
      pdf: pdfBase64,
      stats: {
        fileSizeKB: Math.round(pdf.length / 1024),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error',
      details: err.stack 
    });
  }
});

// Consignment Agreement PDF generation endpoint
app.post('/render-consignment-agreement', async (req, res) => {
  try {
    const { carData, agreementType } = req.body;
    
    if (!carData) {
      return res.status(400).json({ success: false, error: 'Missing car data' });
    }

    const isDriveWhilstSell = agreementType === 'drive-whilst-sell';
    // Get today's date in dd/mm/yyyy format
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth()+1).padStart(2, '0')}/${today.getFullYear()}`;

    // Format price with commas
    const formatPrice = (num) => {
      if (!num) return '';
      return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    // Format dates for display
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()+1).padStart(2, '0')}/${date.getFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    // Use pre-loaded logo (loaded at startup)
    if (!mainLogoBase64) {
      mainLogoBase64 = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';
    }

    // Use unified consignment template for both agreement types
    const htmlTemplate = consignmentTemplateHtml;
    
    if (!htmlTemplate) {
      throw new Error(`${isDriveWhilstSell ? 'Drive whilst sell' : 'Consignment'} template not loaded at startup`);
    }

    // Prepare template variables - match template lowercase naming
    const templateVars = {
      todayStr: todayStr,
      main_logo_src: mainLogoBase64,
      
      // Agreement type checkbox variables
      standard_checked: !isDriveWhilstSell ? 'checked' : '',
      drive_whilst_sell_checked: isDriveWhilstSell ? 'checked' : '',
      customer_name: carData.customer_name || '',
      customer_phone: carData.customer_phone || '',
      customer_email: carData.customer_email || '',
      model_year: carData.model_year || '',
      vehicle_model: carData.vehicle_model || '',
      chassis_number: carData.chassis_number || '',
      colour: carData.colour || '',
      mileage_display: carData.current_mileage_km ? `${formatPrice(carData.current_mileage_km)} km` : '',
      cost_price_formatted: carData.cost_price_aed ? formatPrice(carData.cost_price_aed) : '',
      advertised_price_formatted: carData.advertised_price_aed ? formatPrice(carData.advertised_price_aed) : '',
      registration_expiry_formatted: formatDate(carData.registration_expiry_date),
      insurance_expiry_formatted: formatDate(carData.insurance_expiry_date),
      
      // Vehicle history disclosure checkboxes
      accident_yes_checked: carData.customer_disclosed_accident === true ? 'checked' : '',
      accident_no_checked: carData.customer_disclosed_accident !== true ? 'checked' : '',
      flood_yes_checked: carData.customer_disclosed_flood_damage === true ? 'checked' : '',
      flood_no_checked: carData.customer_disclosed_flood_damage !== true ? 'checked' : '',
      damage_disclosure_details: carData.damage_disclosure_details || '',
      
      // Handover checklist checkboxes
      service_records_yes_checked: carData.service_records_acquired === true ? 'checked' : '',
      service_records_no_checked: carData.service_records_acquired !== true ? 'checked' : '',
      owners_manual_yes_checked: carData.owners_manual_acquired === true ? 'checked' : '',
      owners_manual_no_checked: carData.owners_manual_acquired !== true ? 'checked' : '',
      spare_tyre_yes_checked: carData.spare_tyre_tools_acquired === true ? 'checked' : '',
      spare_tyre_no_checked: carData.spare_tyre_tools_acquired !== true ? 'checked' : '',
      fire_extinguisher_yes_checked: carData.fire_extinguisher_acquired === true ? 'checked' : '',
      fire_extinguisher_no_checked: carData.fire_extinguisher_acquired !== true ? 'checked' : '',
      
      // Other accessories checkboxes and details
      other_accessories_yes_checked: carData.other_accessories_acquired === true ? 'checked' : '',
      other_accessories_no_checked: carData.other_accessories_acquired !== true ? 'checked' : '',
      other_accessories_details: carData.other_accessories_details || '',
      
      // Damage assessment data
      damage_diagram_image_url: carData.damage_diagram_image_url || '',
      visual_inspection_notes: carData.visual_inspection_notes || 'No specific damage or issues noted during inspection.'
    };

    // Process damage markers if they exist AND we don't have a damage report image
    // (If we have a damage report image, the markers are already included in the image)
    let damageMarkersHtml = '';
    const hasDamageReportImage = carData.damage_diagram_image_url && 
                                 !carData.damage_diagram_image_url.includes('Pre uvc-2.jpg');
    
    if (carData.damage_annotations && Array.isArray(carData.damage_annotations) && carData.damage_annotations.length > 0 && !hasDamageReportImage) {
      damageMarkersHtml = carData.damage_annotations.map(marker => {
        // Convert pixel coordinates to percentages (assuming 2029x765 diagram)
        const x_percent = ((marker.x || 0) / 2029 * 100).toFixed(2);
        const y_percent = ((marker.y || 0) / 765 * 100).toFixed(2);
        const damage_type_short = marker.damageType || 'D';
        const severity = marker.severity || 'minor';
        
        return `<div style="position: absolute; left: ${x_percent}%; top: ${y_percent}%; transform: translate(-50%, -50%); width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; color: white; font-weight: bold; font-size: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,0.3); background-color: ${severity === 'minor' ? '#FFA500' : severity === 'moderate' ? '#FF6B35' : '#FF0000'};">
              ${damage_type_short}
            </div>`;
      }).join('');
    } else if (hasDamageReportImage) {
    } else {
    }

    // Replace template variables
    let finalHtml = htmlTemplate;
    for (const [key, value] of Object.entries(templateVars)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const beforeLength = finalHtml.length;
      finalHtml = finalHtml.replace(regex, value || '');
      const afterLength = finalHtml.length;
      if (beforeLength !== afterLength) {
      }
    }
    
    // Handle damage markers loop
    const damageMarkersRegex = /{{#each damage_markers}}[\s\S]*?{{\/each}}/g;
    finalHtml = finalHtml.replace(damageMarkersRegex, damageMarkersHtml);
    
    // Handle conditional other accessories details
    const otherAccessoriesRegex = /{{#if other_accessories_details}}([\s\S]*?){{\/if}}/g;
    if (carData.other_accessories_details && carData.other_accessories_details.trim()) {
      // Keep the content inside the if block
      finalHtml = finalHtml.replace(otherAccessoriesRegex, '$1');
    } else {
      // Remove the entire if block
      finalHtml = finalHtml.replace(otherAccessoriesRegex, '');
    }
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    // Set content and wait for everything to load
    await page.setContent(finalHtml, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for fonts to load
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(1000); // Additional wait for styling

    // Generate PDF with A4 settings
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true
    });

    await browser.close();

    const fileSizeMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
    // Return base64 PDF data
    res.json({
      success: true,
      pdfData: pdfBuffer.toString('base64'),
      fileName: `consignment-agreement-${carData.stock_number || 'draft'}.pdf`,
      pdfStats: {
        fileSizeMB,
        pageCount: 2
      }
    });

  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
});

// Health check endpoint
// Myth Buster Monday Endpoint
app.post('/render-myth-buster', async (req, res) => {
  try {
    const { html, templateType, width = 2160, height = 3840 } = req.body;
    if (!html || !templateType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: html and templateType' 
      });
    }
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    // Instagram story format - default 2x (2160x3840) for high quality
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Wait for fonts to load (using same approach as content pillars)
    await page.evaluate(() => document.fonts && document.fonts.ready);
    
    // Check image loading status
    const imageInfo = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.map(img => ({
        src: img.src,
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }));
    });
    // Force font loading by applying styles (same as content pillars)
    await page.evaluate(() => {
      // Create test elements for Resonate font
      const resonateTest = document.createElement('div');
      resonateTest.style.fontFamily = 'Resonate, Inter, Arial, sans-serif';
      resonateTest.style.fontSize = '72px';
      resonateTest.style.fontWeight = '900';
      resonateTest.style.position = 'absolute';
      resonateTest.style.left = '-9999px';
      resonateTest.innerHTML = 'Myth Buster Test';
      document.body.appendChild(resonateTest);
      
      // Force layout calculation
      resonateTest.offsetHeight;
      
      // Remove test element
      document.body.removeChild(resonateTest);
    });
    
    // Give extra time for custom fonts and external images to load
    await page.waitForTimeout(3000);
    const imageBuffer = await page.screenshot({ 
      type: 'png', 
      clip: { x: 0, y: 0, width, height } 
    });
    await browser.close();
    const mythBusterImage = imageBuffer.toString('base64');
    
    const fileSizeMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);
    res.json({ 
      success: true, 
      mythBusterImage,
      templateType,
      stats: {
        fileSizeMB,
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
});

// Damage Report Endpoint
app.post('/render-damage-report', async (req, res) => {
  try {
    const { carDetails, damageAnnotations, inspectionNotes, diagramImageUrl, timestamp } = req.body;

    if (!damageAnnotations || !diagramImageUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: damageAnnotations and diagramImageUrl' 
      });
    }

    if (!damageReportTemplateHtml) {
      return res.status(500).json({ 
        success: false, 
        error: 'Damage report template not loaded' 
      });
    }
    // Convert damage markers to template format with percentage coordinates
    const damageMarkers = damageAnnotations.map(marker => ({
      damageType: marker.damageType,
      severity: marker.severity,
      x_percent: (marker.x / 2029) * 100, // Convert to percentage
      y_percent: (marker.y / 765) * 100   // Convert to percentage
    }));
    // Prepare template data
    const templateData = {
      DIAGRAM_IMAGE_URL: diagramImageUrl,
      DAMAGE_MARKERS: damageMarkers,
      INSPECTION_NOTES: inspectionNotes || ''
    };

    // Replace template variables
    let html = damageReportTemplateHtml;
    
    // Replace simple variables
    html = html.replace(/{{DIAGRAM_IMAGE_URL}}/g, templateData.DIAGRAM_IMAGE_URL);
    html = html.replace(/{{INSPECTION_NOTES}}/g, templateData.INSPECTION_NOTES);
    
    // Handle damage markers loop
    let markersHtml = '';
    templateData.DAMAGE_MARKERS.forEach(marker => {
      markersHtml += `
        <div class="damage-marker ${marker.severity}" 
             style="left: ${marker.x_percent}%; top: ${marker.y_percent}%;">
          ${marker.damageType}
        </div>`;
    });
    
    // Replace the handlebars loop with actual HTML
    html = html.replace(/{{#each DAMAGE_MARKERS}}[\s\S]*?{{\/each}}/g, markersHtml);
    
    // Handle conditional inspection notes
    if (templateData.INSPECTION_NOTES) {
      html = html.replace(/{{#if INSPECTION_NOTES}}/g, '');
      html = html.replace(/{{\/if}}/g, '');
    } else {
      // Remove the entire inspection notes section if no notes
      html = html.replace(/{{#if INSPECTION_NOTES}}[\s\S]*?{{\/if}}/g, '');
    }
    // Generate image using Playwright
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    // Set viewport to exact dimensions
    await page.setViewportSize({ width: 2029, height: 765 });
    
    // Set content and wait for image to load
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Debug: Check if image loaded and markers are present
    const debugInfo = await page.evaluate(() => {
      const img = document.querySelector('.car-diagram img');
      const markers = document.querySelectorAll('.damage-marker');
      return {
        imageLoaded: img ? img.complete && img.naturalWidth > 0 : false,
        imageUrl: img ? img.src : 'no image',
        markersCount: markers.length,
        markersHTML: Array.from(markers).map(m => m.outerHTML)
      };
    });
    // Wait extra time for external image to load
    await page.waitForTimeout(3000);

    // Generate high-quality PNG with exact dimensions
    const imageBuffer = await page.screenshot({
      type: 'png',
      fullPage: true,
      omitBackground: false
    });

    await browser.close();

    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    
    const fileSizeMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);
    res.json({
      success: true,
      damageReportImage: base64Image
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/render-pdf-to-images', async (req, res) => {
  try {
    const { pdfUrl, scale = 2.0 } = req.body || {};

    if (!pdfUrl) {
      return res.status(400).json({ success: false, error: 'pdfUrl is required' });
    }
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.goto('about:blank');

      const pdfJsCdnVersion = '3.11.174';
      const pdfJsScript = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfJsCdnVersion}/pdf.min.js`;
      const pdfJsWorker = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfJsCdnVersion}/pdf.worker.min.js`;

      await page.addScriptTag({ url: pdfJsScript });

      const pages = await page.evaluate(async ({ pdfUrl, scale, pdfJsWorker }) => {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfJsWorker;

        const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
        const images = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;

          const dataUrl = canvas.toDataURL('image/png');
          images.push({
            pageIndex: i,
            width: canvas.width,
            height: canvas.height,
            dataUrl
          });
        }

        return images;
      }, { pdfUrl, scale, pdfJsWorker });
      res.json({ success: true, pages });
    } finally {
      await browser.close();
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3000,
    templatesLoaded: Object.keys(contentPillarTemplates).length,
    damageReportTemplateLoaded: !!damageReportTemplateHtml
  });
});

const port = process.env.PORT || 3001;

loadTemplate().then(() => {
  app.listen(port);
}).catch((e) => {
  process.exit(1);
}); 