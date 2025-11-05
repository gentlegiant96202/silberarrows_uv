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
let consignmentTemplateHtml = '';
let damageReportTemplateHtml = '';
let mainLogoBase64 = '';
let contentPillarHtmls = {};

async function loadTemplate() {
  console.log('📁 Loading templates...');
  console.log('📄 Story template path:', templatePath);
  console.log('📄 4:5 template path:', template45Path);
  console.log('📄 Catalog template path:', catalogTemplatePath);
  console.log('📄 Consignment template path:', consignmentTemplatePath);
  console.log('📄 Damage Report template path:', damageReportTemplatePath);
  
  try {
    templateHtml = await fs.readFile(templatePath, 'utf-8');
    console.log('✅ Story template loaded, length:', templateHtml.length);
  } catch (err) {
    console.error('❌ Error loading story template:', err);
    throw err;
  }
  
  try {
    template45Html = await fs.readFile(template45Path, 'utf-8');
    console.log('✅ 4:5 template loaded, length:', template45Html.length);
  } catch (err) {
    console.error('❌ Error loading 4:5 template:', err);
    throw err;
  }
  
  try {
    catalogTemplateHtml = await fs.readFile(catalogTemplatePath, 'utf-8');
    console.log('✅ Catalog template loaded, length:', catalogTemplateHtml.length);
  } catch (err) {
    console.error('❌ Error loading catalog template:', err);
    throw err;
  }
  
  try {
    leasingCatalogTemplateHtml = await fs.readFile(leasingCatalogTemplatePath, 'utf-8');
    console.log('✅ Leasing Catalog template loaded, length:', leasingCatalogTemplateHtml.length);
  } catch (err) {
    console.error('❌ Error loading leasing catalog template:', err);
    throw err;
  }
  
  try {
    consignmentTemplateHtml = await fs.readFile(consignmentTemplatePath, 'utf-8');
    console.log('✅ Consignment template loaded, length:', consignmentTemplateHtml.length);
  } catch (err) {
    console.error('❌ Error loading consignment template:', err);
    throw err;
  }
  
  
  try {
    damageReportTemplateHtml = await fs.readFile(damageReportTemplatePath, 'utf-8');
    console.log('✅ Damage Report template loaded, length:', damageReportTemplateHtml.length);
  } catch (err) {
    console.error('❌ Error loading damage report template:', err);
    console.error('❌ This is non-critical, service will continue without damage report functionality');
    damageReportTemplateHtml = ''; // Don't fail startup
  }
  
  // Load main logo as base64 at startup
  try {
    const logoPath = path.resolve(__dirname, '../public/main-logo.png');
    const logoBuffer = await fs.readFile(logoPath);
    mainLogoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    console.log('✅ Main logo loaded as base64, length:', mainLogoBase64.length);
  } catch (error) {
    console.error('❌ Error loading main logo:', error);
    // Fallback to original logo
    mainLogoBase64 = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';
    console.log('✅ Using fallback logo URL');
  }
  
  // Load content pillar templates
  for (const [day, templatePath] of Object.entries(contentPillarTemplates)) {
    try {
      contentPillarHtmls[day] = await fs.readFile(templatePath, 'utf-8');
      console.log(`✅ Content pillar template loaded for ${day}, length:`, contentPillarHtmls[day].length);
    } catch (err) {
      console.error(`❌ Error loading ${day} content pillar template:`, err);
      throw err;
    }
  }
  }

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

function fillTemplate({ carDetails, pricing, firstImageUrl }) {
  let html = templateHtml;
  
  // Handle mileage - if it's "N/A" or empty, show "N/A"
  const mileageDisplay = carDetails.mileage && carDetails.mileage !== 'N/A' && carDetails.mileage.trim() !== '' 
    ? carDetails.mileage 
    : 'N/A';
    
  // Handle horsepower - if it's null, undefined, or empty, show 'N/A'
  const horsepowerDisplay = carDetails.horsepower && carDetails.horsepower !== null && carDetails.horsepower !== '' 
    ? String(carDetails.horsepower)
    : 'N/A';
  
  console.log('🔧 Template values - Mileage:', mileageDisplay, 'Horsepower:', horsepowerDisplay);
  
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
    '{{carImageUrl1}}': String(firstImageUrl ?? ''),
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
  }
  return html;
}

function fillTemplate45({ carDetails, pricing, firstImageUrl }) {
  let html = template45Html;
  
  // Handle mileage - if it's "N/A" or empty, show "N/A"
  const mileageDisplay = carDetails.mileage && carDetails.mileage !== 'N/A' && carDetails.mileage.trim() !== '' 
    ? carDetails.mileage 
    : 'N/A';
    
  // Handle horsepower - if it's null, undefined, or empty, show 'N/A'
  const horsepowerDisplay = carDetails.horsepower && carDetails.horsepower !== null && carDetails.horsepower !== '' 
    ? String(carDetails.horsepower)
    : 'N/A';
  
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
    '{{carImageUrl1}}': String(firstImageUrl ?? ''),
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
  // Leasing-specific template with 4:5 ratio
  
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
    console.log('🚀 Render request received');
    console.log('📊 Request body keys:', Object.keys(req.body || {}));
    
    const { carDetails, pricing, firstImageUrl, secondImageUrl } = req.body || {};
    
    console.log('🚗 Car details:', carDetails);
    console.log('🔍 Mileage value:', carDetails.mileage, typeof carDetails.mileage);
    console.log('🔍 Horsepower value:', carDetails.horsepower, typeof carDetails.horsepower);
    console.log('💰 Pricing:', pricing);
    console.log('🖼️ Image URL:', firstImageUrl ? 'Present' : 'Missing');
    
    if (!carDetails || !pricing || !firstImageUrl) {
      console.error('❌ Missing required fields:', { carDetails: !!carDetails, pricing: !!pricing, firstImageUrl: !!firstImageUrl });
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log('🎨 Filling templates...');
    const storyHtml = fillTemplate({ carDetails, pricing, firstImageUrl, secondImageUrl });
    const postHtml = fillTemplate45({ carDetails, pricing, firstImageUrl, secondImageUrl });
    console.log('✅ Templates filled - Story:', storyHtml.length, 'Post:', postHtml.length);

    // Prefer Playwright; it exists in this image
    console.log('🎭 Launching Playwright...');
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    console.log('✅ Browser launched');

    // Story 9:16
    console.log('📱 Setting up Story format (9:16)...');
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.setContent(storyHtml, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(800);
    console.log('📸 Taking story screenshot...');
    const storyBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    console.log('✅ Story screenshot taken');

    // 4:5
    console.log('📐 Setting up Post format (4:5)...');
    await page.setViewportSize({ width: 1080, height: 1350 });
    await page.setContent(postHtml, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(400);
    console.log('📸 Taking post screenshot...');
    const postBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    console.log('✅ Post screenshot taken');

    await browser.close();
    console.log('🔒 Browser closed');

    const image45 = postBuffer.toString('base64');
    const imageStory = storyBuffer.toString('base64');

    res.json({ success: true, image45, imageStory });
  } catch (err) {
    console.error('❌ Render error:', err);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', {
      message: err.message,
      name: err.name,
      code: err.code
    });
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.post('/render-catalog', async (req, res) => {
  try {
    console.log('🚀 Catalog render request received');
    console.log('📊 Request body keys:', Object.keys(req.body || {}));
    
    const { carDetails, catalogImageUrl } = req.body || {};
    
    console.log('🚗 Car details received:', JSON.stringify(carDetails, null, 2));
    console.log('🖼️ Catalog image URL:', catalogImageUrl);
    
    if (!carDetails || !catalogImageUrl) {
      console.error('❌ Missing required fields:', { carDetails: !!carDetails, catalogImageUrl: !!catalogImageUrl });
      return res.status(400).json({ success: false, error: 'Missing required fields: carDetails and catalogImageUrl' });
    }

    console.log('🎨 Filling catalog template...');
    const html = fillCatalogTemplate({ carDetails, catalogImageUrl });
    console.log('✅ Template filled, length:', html.length);

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
      console.log('⏳ Waiting for fonts to load...');
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
      console.log('✅ Fonts loaded successfully');
    } catch (e) {
      console.log('Font loading timeout, proceeding...', e.message);
    }
    
    // Capture the card element itself to guarantee exact 3000x3000 output
    const cardEl = await page.$('.catalog-card-container');
    const catalogBuffer = await cardEl.screenshot({ type: 'png' });

    await browser.close();

    const catalogImage = catalogBuffer.toString('base64');

    res.json({ success: true, catalogImage });
  } catch (err) {
    console.error('Catalog render error:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.post('/render-leasing-catalog', async (req, res) => {
  try {
    console.log('🚀 Leasing Catalog render request received');
    console.log('📊 Request body keys:', Object.keys(req.body || {}));
    
    const { carDetails, catalogImageUrl } = req.body || {};
    
    console.log('🚗 Car details received:', JSON.stringify(carDetails, null, 2));
    console.log('🖼️ Catalog image URL:', catalogImageUrl);
    
    if (!carDetails || !catalogImageUrl) {
      console.error('❌ Missing required fields:', { carDetails: !!carDetails, catalogImageUrl: !!catalogImageUrl });
      return res.status(400).json({ success: false, error: 'Missing required fields: carDetails and catalogImageUrl' });
    }

    console.log('🎨 Filling leasing catalog template...');
    const html = fillLeasingCatalogTemplate({ carDetails, catalogImageUrl });
    console.log('✅ Template filled, length:', html.length);

    // Prefer Playwright; it exists in this image
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // 4:5 aspect ratio for leasing catalog (2400x3000)
    await page.setViewportSize({ width: 2400, height: 3000 });
    
    // Set shorter timeout and don't wait for network idle for external images
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Enhanced font loading
    try {
      console.log('⏳ Waiting for fonts to load...');
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(3000);
      console.log('✅ Fonts loaded successfully');
    } catch (e) {
      console.log('Font loading timeout, proceeding...', e.message);
    }
    
    // Capture the ad container element for exact 2400x3000 output
    const cardEl = await page.$('.ad-container');
    const catalogBuffer = await cardEl.screenshot({ type: 'png' });

    await browser.close();

    const catalogImage = catalogBuffer.toString('base64');

    res.json({ success: true, catalogImage });
  } catch (err) {
    console.error('Leasing Catalog render error:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

app.post('/render-content-pillar', async (req, res) => {
  try {
    console.log('🚀 Content pillar render request received');
    console.log('📊 Request body keys:', Object.keys(req.body || {}));
    
    const { 
      title, description, imageUrl, dayOfWeek, badgeText, subtitle,
      myth, fact, problem, solution, difficulty, tools_needed, warning 
    } = req.body || {};
    
    console.log('📝 Content pillar details:', { 
      title, description, imageUrl: imageUrl ? 'Present' : 'Missing', dayOfWeek, badgeText, subtitle,
      hasExtendedFields: !!(myth || fact || problem || solution || difficulty || tools_needed || warning)
    });
    
    if (!title || !description || !imageUrl || !dayOfWeek) {
      console.error('❌ Missing required fields:', { title: !!title, description: !!description, imageUrl: !!imageUrl, dayOfWeek: !!dayOfWeek });
      return res.status(400).json({ success: false, error: 'Missing required fields: title, description, imageUrl, dayOfWeek' });
    }

    console.log('🎨 Filling content pillar template...');
    const html = fillContentPillarTemplate({ 
      title, description, imageUrl, dayOfWeek, badgeText, subtitle,
      myth, fact, problem, solution, difficulty, tools_needed, warning 
    });
    console.log('✅ Template filled, length:', html.length);

            console.log('🎭 Launching Playwright...');
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        console.log('✅ Browser launched');

        // Instagram story format (1080x1920)
        console.log('📐 Setting up Instagram story format (1080x1920)...');
        await page.setViewportSize({ width: 1080, height: 1920 });
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
        await page.evaluate(() => document.fonts && document.fonts.ready);
        await page.waitForTimeout(1000);
        console.log('📸 Taking screenshot...');
        const imageBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
        console.log('✅ Screenshot taken');

    await browser.close();
    console.log('🔒 Browser closed');

    const contentPillarImage = imageBuffer.toString('base64');

    res.json({ success: true, contentPillarImage });
  } catch (err) {
    console.error('❌ Content pillar render error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// New endpoint to render from provided HTML directly
app.post('/render-html', async (req, res) => {
  try {
    const { html, dayOfWeek } = req.body;
    
    console.log('🎨 Rendering from provided HTML:', { dayOfWeek, htmlLength: html?.length });
    
    if (!html || !dayOfWeek) {
      return res.status(400).json({ success: false, error: 'Missing html or dayOfWeek' });
    }

    console.log('🚀 Launching browser...');
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    console.log('✅ Browser launched');

    // Instagram story format (1080x1920)
    console.log('📐 Setting up Instagram story format (1080x1920)...');
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Use Google Fonts which load reliably in headless browsers
    
    // Wait for fonts and images to load
    console.log('⏳ Waiting for fonts and images to load...');
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
    console.log('🖼️ Image loading status:', imageInfo);
    
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
    console.log('🔤 Font loading status:', fontInfo);
    
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
    
    console.log('📸 Taking screenshot...');
    const imageBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
    console.log('✅ Screenshot taken');

    await browser.close();
    console.log('🔒 Browser closed');

    const contentPillarImage = imageBuffer.toString('base64');

    res.json({ success: true, contentPillarImage });
  } catch (err) {
    console.error('❌ HTML render error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// NEW: PDF generation endpoint (separate from existing functions)
app.post('/render-car-pdf', async (req, res) => {
  try {
    console.log('🚀 PDF render request received');
    const { html } = req.body;
    
    if (!html) {
      return res.status(400).json({ success: false, error: 'Missing HTML content' });
    }

    console.log('📄 Starting PDF generation...');
    console.log('📊 HTML length:', html.length);

    // Launch Playwright for PDF generation
    console.log('🎭 Launching Playwright for PDF...');
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    console.log('✅ Browser launched for PDF generation');

    // Set content and wait for everything to load
    console.log('📝 Loading HTML content...');
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Wait for fonts and images to load
    console.log('⏳ Waiting for fonts and images to load...');
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(3000); // Give extra time for images
    console.log('✅ Content loaded, generating PDF...');

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
    console.log('🔒 Browser closed');
    console.log('✅ PDF generated successfully, size:', Math.round(pdf.length / 1024), 'KB');

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
    console.error('❌ PDF render error:', err);
    console.error('❌ Error stack:', err.stack);
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
    console.log('🚀 Consignment Agreement PDF render request received');
    const { carData, agreementType } = req.body;
    
    if (!carData) {
      return res.status(400).json({ success: false, error: 'Missing car data' });
    }

    const isDriveWhilstSell = agreementType === 'drive-whilst-sell';
    console.log(`📄 Generating ${isDriveWhilstSell ? 'Drive Whilst Sell' : 'Consignment'} Agreement PDF for car:`, carData.stock_number);

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
      console.error('❌ Main logo not loaded at startup, using fallback');
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
      console.log(`🎯 Processing ${carData.damage_annotations.length} damage markers (no damage report image found)`);
      
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
      
      console.log(`✅ Generated damage markers HTML: ${damageMarkersHtml.length} characters`);
    } else if (hasDamageReportImage) {
      console.log('ℹ️ Using damage report image - markers already included in image');
    } else {
      console.log('ℹ️ No damage markers found');
    }

    // Replace template variables
    let finalHtml = htmlTemplate;
    console.log('🔄 Starting template variable replacement...');
    console.log('📋 Template variables:', Object.keys(templateVars));
    
    for (const [key, value] of Object.entries(templateVars)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      const beforeLength = finalHtml.length;
      finalHtml = finalHtml.replace(regex, value || '');
      const afterLength = finalHtml.length;
      if (beforeLength !== afterLength) {
        console.log(`✅ Replaced {{${key}}} with "${value}"`);
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
      console.log('✅ Other accessories details section included');
    } else {
      // Remove the entire if block
      finalHtml = finalHtml.replace(otherAccessoriesRegex, '');
      console.log('✅ Other accessories details section removed (no content)');
    }
    
    console.log('✅ Template variable replacement completed');

    console.log('📄 Starting PDF generation with Playwright...');
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
    console.log('📄 Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true
    });

    await browser.close();

    const fileSizeMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`✅ Consignment Agreement PDF generated: ${fileSizeMB}MB`);

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
    console.error('❌ Consignment Agreement PDF render error:', err);
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
    console.log('🎨 Myth Buster Monday render request received');
    const { html, templateType, width = 2160, height = 3840 } = req.body;
    
    console.log('📝 Request details:', { 
      templateType, 
      htmlLength: html?.length || 0,
      dimensions: `${width}x${height}`
    });
    
    if (!html || !templateType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: html and templateType' 
      });
    }

    console.log('🚀 Launching browser for Myth Buster Monday...');
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ 
      headless: true, 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    console.log('✅ Browser launched');

    // Instagram story format - default 2x (2160x3840) for high quality
    console.log(`📐 Setting up Instagram story format (${width}x${height})...`);
    await page.setViewportSize({ width, height });
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 30000 });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Wait for fonts to load (using same approach as content pillars)
    console.log('⏳ Waiting for fonts and images to load...');
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
    console.log('🖼️ Image loading status:', imageInfo);
    
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
    
    console.log('📸 Taking screenshot...');
    const imageBuffer = await page.screenshot({ 
      type: 'png', 
      clip: { x: 0, y: 0, width, height } 
    });
    console.log('✅ Screenshot taken');

    await browser.close();
    console.log('🔒 Browser closed');

    const mythBusterImage = imageBuffer.toString('base64');
    
    const fileSizeMB = (imageBuffer.length / (1024 * 1024)).toFixed(2);
    console.log(`✅ Myth Buster ${templateType} image generated: ${fileSizeMB}MB`);

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
    console.error('❌ Myth Buster render error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    });
  }
});

// Damage Report Endpoint
app.post('/render-damage-report', async (req, res) => {
  try {
    console.log('🔧 Damage report render request received');
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

    console.log('📊 Car details:', carDetails);
    console.log('🎯 Damage annotations count:', damageAnnotations.length);

    // Convert damage markers to template format with percentage coordinates
    const damageMarkers = damageAnnotations.map(marker => ({
      damageType: marker.damageType,
      severity: marker.severity,
      x_percent: (marker.x / 2029) * 100, // Convert to percentage
      y_percent: (marker.y / 765) * 100   // Convert to percentage
    }));

    console.log('🎯 Converted damage markers:', damageMarkers);

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

    console.log('🎨 Generating damage report image...');
    console.log('🔍 Final HTML length:', html.length);
    console.log('🔍 Markers HTML:', markersHtml);
    console.log('🔍 Diagram URL:', templateData.DIAGRAM_IMAGE_URL);

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
    
    console.log('🔍 Debug info:', debugInfo);
    
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
    console.log(`✅ Damage report image generated: ${fileSizeMB}MB`);

    res.json({
      success: true,
      damageReportImage: base64Image
    });

  } catch (error) {
    console.error('❌ Damage report generation error:', error);
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

    console.log('🖼️ PDF-to-image conversion requested:', { pdfUrl, scale });

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

      console.log('🖼️ PDF-to-image conversion complete:', { pageCount: pages.length });
      res.json({ success: true, pages });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('❌ PDF-to-image conversion failed:', error);
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
  app.listen(port, () => console.log(`Renderer listening on :${port}`));
}).catch((e) => {
  console.error('Failed to load template:', e);
  process.exit(1);
}); 