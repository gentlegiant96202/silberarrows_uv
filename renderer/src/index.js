import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const templatePath = path.resolve(__dirname, '../public/templates/price-drop-template.html');
const catalogTemplatePath = path.resolve(__dirname, '../public/templates/xml-catalog-template.html');
let templateHtml = '';
let catalogTemplateHtml = '';

async function loadTemplate() {
  templateHtml = await fs.readFile(templatePath, 'utf-8');
  catalogTemplateHtml = await fs.readFile(catalogTemplatePath, 'utf-8');
}

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

function fillTemplate({ carDetails, pricing, firstImageUrl }) {
  let html = templateHtml;
  const replacements = {
    '{{year}}': String(carDetails.year ?? ''),
    '{{model}}': String(carDetails.model ?? ''),
    '{{mileage}}': String(carDetails.mileage ?? ''),
    '{{horsepower}}': String(carDetails.horsepower ?? ''),
    '{{stockNumber}}': String(carDetails.stockNumber ?? ''),
    '{{wasPrice}}': String(pricing.wasPrice ?? ''),
    '{{nowPrice}}': String(pricing.nowPrice ?? ''),
    '{{savings}}': String(pricing.savings ?? ''),
    '{{monthlyPayment}}': String(pricing.monthlyPayment ?? ''),
    '{{carImageUrl1}}': String(firstImageUrl ?? ''),
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
  }
  return html;
}

function fillCatalogTemplate({ carDetails, catalogImageUrl }) {
  // Calculate monthly payment (assuming 5% interest, 60 months, 20% down payment)
  const price = parseFloat(String(carDetails.price ?? '0').replace(/,/g, ''));
  const loanAmount = price * 0.8; // 80% financed
  const monthlyRate = 0.05 / 12; // 5% annual rate
  const months = 60;
  const monthlyPayment = loanAmount > 0 ? Math.round(loanAmount * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))) : 0;
  
  let html = catalogTemplateHtml;
  const replacements = {
    '{{year}}': String(carDetails.year ?? ''),
    '{{model}}': String(carDetails.model ?? ''),
    '{{mileage}}': String(carDetails.mileage ?? ''),
    '{{stockNumber}}': String(carDetails.stockNumber ?? ''),
    '{{price}}': String(carDetails.price ?? ''),
    '{{monthlyPayment}}': String(monthlyPayment.toLocaleString()),
    '{{catalogImageUrl}}': String(catalogImageUrl ?? ''),
  };
  for (const [key, value] of Object.entries(replacements)) {
    html = replaceAll(html, key, value);
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

    const html = fillTemplate({ carDetails, pricing, firstImageUrl, secondImageUrl });

    // Prefer Playwright; it exists in this image
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Story 9:16
    await page.setViewportSize({ width: 1080, height: 1920 });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(800);
    const storyBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });

    // 4:5
    await page.setViewportSize({ width: 1080, height: 1350 });
    await page.waitForTimeout(200);
    const postBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1350 } });

    await browser.close();

    const image45 = postBuffer.toString('base64');
    const imageStory = storyBuffer.toString('base64');

    res.json({ success: true, image45, imageStory });
  } catch (err) {
    console.error('Render error:', err);
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

    // Square format for catalog (1080x1080)
    await page.setViewportSize({ width: 1080, height: 1080 });
    
    // Set shorter timeout and don't wait for network idle for external images
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.addStyleTag({ content: '*{ -webkit-font-smoothing: antialiased; }' });
    
    // Wait for fonts but with shorter timeout
    try {
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(2000); // Wait for image to load
    } catch (e) {
      console.log('Font loading timeout, proceeding...');
    }
    
    const catalogBuffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1080 } });

    await browser.close();

    const catalogImage = catalogBuffer.toString('base64');

    res.json({ success: true, catalogImage });
  } catch (err) {
    console.error('Catalog render error:', err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

const port = process.env.PORT || 3000;

loadTemplate().then(() => {
  app.listen(port, () => console.log(`Renderer listening on :${port}`));
}).catch((e) => {
  console.error('Failed to load template:', e);
  process.exit(1);
}); 