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
let templateHtml = '';

async function loadTemplate() {
  templateHtml = await fs.readFile(templatePath, 'utf-8');
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

const port = process.env.PORT || 3000;

loadTemplate().then(() => {
  app.listen(port, () => console.log(`Renderer listening on :${port}`));
}).catch((e) => {
  console.error('Failed to load template:', e);
  process.exit(1);
}); 