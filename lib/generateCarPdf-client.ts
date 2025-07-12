import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/lib/supabaseClient';

export interface CarForPdf {
  id: string;
  stock_number: string;
  model_year: number;
  vehicle_model: string;
  colour: string;
  interior_colour: string | null;
  horsepower_hp: number | null;
  torque_nm: number | null;
  cubic_capacity_cc: number | null;
  regional_specification: string | null;
  advertised_price_aed: number;
  current_mileage_km: number | null;
  current_warranty: string | null;
  current_service: string | null;
  engine: string | null;
  transmission: string | null;
  description: string | null;
  key_equipment: string | null;
  chassis_number: string;
}

export interface MediaRow { 
  id: string; 
  url: string; 
  kind: 'photo' | 'video' | 'document'; 
}

// Utility to build a hidden DOM node and rasterize to image
async function htmlToImage(html: string, widthPx = 1400) {
  const wrapper = document.createElement('div');
  wrapper.style.width = `${widthPx}px`;
  wrapper.style.padding = '32px';
  wrapper.style.fontFamily = 'Arial, Helvetica, sans-serif';
  wrapper.style.background = '#000';
  wrapper.style.minHeight = '1100px';
  wrapper.style.color = '#fff';
  wrapper.innerHTML = html;
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '-99999px';
  wrapper.style.zIndex = '-9999';
  document.body.appendChild(wrapper);

  // Wait for images to load
  const images = wrapper.querySelectorAll('img');
  await Promise.all(Array.from(images).map(img => {
    return new Promise((resolve) => {
      if (img.complete) {
        resolve(null);
      } else {
        img.onload = () => resolve(null);
        img.onerror = () => resolve(null);
        // Timeout after 5 seconds
        setTimeout(() => resolve(null), 5000);
      }
    });
  }));

  const canvas = await html2canvas(wrapper, {
    scale: 1,
    useCORS: true,
    backgroundColor: '#000',
    imageTimeout: 8000,
    logging: false,
  });
  
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  document.body.removeChild(wrapper);
  return { imgData, width: canvas.width, height: canvas.height };
}

// Helper to chunk an array
function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

// Helper to load an image element for high-quality embedding
async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
    // Timeout after 10 seconds
    setTimeout(() => reject(new Error(`Image load timeout: ${src}`)), 10000);
  });
}

/**
 * Client-side PDF generation with beautiful glassmorphism design
 */
export async function generateCarPdf(car: CarForPdf, media: MediaRow[], onProgress?: (status: string) => void) {
  onProgress?.('Starting PDF generation...');
  
  const photos = media.filter(m => m.kind === 'photo');

  // ------------- Build first page with glassy cards & photo -------------
  const firstPhotoUrl = photos[0]?.url || '';

  const cardStyle = 'background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);border-radius:16px;padding:24px;backdrop-filter:blur(10px);box-shadow:0 8px 32px rgba(0,0,0,0.3);';

  const specsGrid = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 32px;font-size:18px;line-height:1.4;">
        <div style="opacity:.7;font-weight:500;">Exterior Colour</div><div style="font-weight:600;">${car.colour}</div>
        <div style="opacity:.7;font-weight:500;">Interior Colour</div><div style="font-weight:600;">${car.interior_colour ?? '—'}</div>
        <div style="opacity:.7;font-weight:500;">Mileage</div><div style="font-weight:600;">${car.current_mileage_km?.toLocaleString() ?? '—'} km</div>
        <div style="opacity:.7;font-weight:500;">Regional Spec</div><div style="font-weight:600;">${car.regional_specification ?? '—'}</div>
        <div style="opacity:.7;font-weight:500;">Horsepower</div><div style="font-weight:600;">${car.horsepower_hp ? car.horsepower_hp + ' HP' : '—'}</div>
        <div style="opacity:.7;font-weight:500;">Torque</div><div style="font-weight:600;">${car.torque_nm ? car.torque_nm + ' Nm' : '—'}</div>
        <div style="opacity:.7;font-weight:500;">CC</div><div style="font-weight:600;">${car.cubic_capacity_cc ? car.cubic_capacity_cc + ' CC' : '—'}</div>
        <div style="opacity:.7;font-weight:500;">Engine</div><div style="font-weight:600;">${car.engine ?? '—'}</div>
        <div style="opacity:.7;font-weight:500;">Transmission</div><div style="font-weight:600;">${car.transmission ?? '—'}</div>
        <div style="opacity:.7;font-weight:500;">Warranty</div><div style="font-weight:600;">${car.current_warranty ? car.current_warranty.replace(/\b\w+/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).replace(/Silberarrows/gi,'SilberArrows') : '—'}</div>
        <div style="opacity:.7;font-weight:500;">Service</div><div style="font-weight:600;">${car.current_service ? car.current_service.replace(/\b\w+/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).replace(/Silberarrows/gi,'SilberArrows') : '—'}</div>
        <div style="opacity:.7;font-weight:500;">Price</div><div style="font-weight:600;color:#00ff88;">AED ${car.advertised_price_aed.toLocaleString()}</div>
        <div style="opacity:.7;font-weight:500;">Payment Plans</div><div style="font-weight:600;color:#00ff88;">${(()=>{ const p=car.advertised_price_aed||0; if(!p) return '—'; const r=0.025/12; const n=60; const calc=(pr: number)=>Math.round(pr*r/(1-Math.pow(1+r,-n))).toLocaleString(); const m0=calc(p); const m20=calc(p*0.8); return `0%: AED ${m0}/mo  |  20%: AED ${m20}/mo`;})()}</div>
      </div>`;

  const descHtml = car.description ? `<h2 style="margin:0 0 16px;font-size:28px;font-weight:700;">Description</h2><p style="white-space:pre-wrap;line-height:1.6;font-size:16px;opacity:0.9;">${car.description}</p>` : '';
  const equipItems = car.key_equipment ? car.key_equipment.split(/[\n,]+/).map(item=>item.trim()) : [];
  const toTitle=(s:string)=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  const equipHtml = equipItems.length ? `<h2 style="margin:24px 0 16px;font-size:28px;font-weight:700;">Key Equipment</h2><ul style="margin:0;padding:0;list-style:none;columns:2 auto;column-gap:32px;line-height:1.6;font-size:16px">${equipItems.map(item=>`<li style="break-inside:avoid-column;margin-bottom:8px;opacity:0.9;">• ${toTitle(item)}</li>`).join('')}</ul>` : '';

  const firstHtml = `
    <!-- Header -->
    <div style="display:flex;align-items:center;margin:-32px -32px 32px -32px;padding:24px 32px;background:linear-gradient(135deg, #1a1a1a 0%, #000 100%);border-bottom:1px solid rgba(255,255,255,0.1);">
      <div style="font-size:42px;font-weight:800;color:#fff;line-height:1;letter-spacing:-1px;">Vehicle Quotation</div>
      <div style="margin-left:auto;display:flex;align-items:center;gap:16px;">
        <div style="font-size:16px;opacity:0.8;">CHASSIS # (${car.chassis_number})</div>
        <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" style="height:60px;width:auto;object-fit:contain;" />
      </div>
    </div>

    <!-- Main grid -->
    <div style="display:grid;grid-template-columns:0.65fr 1.35fr;gap:32px;margin-bottom:32px;align-items:start;">
      <!-- Specs Card -->
      <div style="${cardStyle}">
        ${specsGrid}
      </div>

      <!-- Photo Card -->
      <div style="${cardStyle}padding:0;display:flex;flex-direction:column;height:100%;align-self:stretch;overflow:hidden;min-height:400px;">
        ${firstPhotoUrl ? `<img src="${firstPhotoUrl}" style="flex:1;width:100%;height:100%;object-fit:cover;border-radius:16px;" />` : '<div style="display:flex;align-items:center;justify-content:center;height:400px;color:#888;font-size:18px;">No Image Available</div>'}
      </div>
    </div>

    <!-- Description & Equipment Card -->
    ${(car.description || car.key_equipment) ? `<div style="${cardStyle}">
      ${descHtml}
      ${equipHtml}
    </div>` : ''}
  `;

  onProgress?.('Generating first page...');

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const firstImg = await htmlToImage(firstHtml);
  pdf.setFillColor(0, 0, 0); 
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  const scaleFirst = Math.min(pageWidth / firstImg.width, pageHeight / firstImg.height);
  pdf.addImage(
    firstImg.imgData,
    'JPEG',
    (pageWidth - firstImg.width * scaleFirst) / 2,
    0,
    firstImg.width * scaleFirst,
    firstImg.height * scaleFirst,
    undefined,
    'NONE'
  );

  // ------------- Additional pages with remaining photos -------------
  const remainingPhotos = photos.slice(1);
  const photoPairs = chunk(remainingPhotos, 2);
  
  for (let i = 0; i < photoPairs.length; i++) {
    const pair = photoPairs[i];
    if (pair.length === 0) continue;
    
    onProgress?.(`Adding photos page ${i + 2}...`);
    
    pdf.addPage();
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    const margin = 40;
    const gapY = 20;
    const slotH = (pageHeight - margin * 2 - (pair.length === 2 ? gapY : 0)) / pair.length;
    const maxW = pageWidth - margin * 2;

    for (let j = 0; j < pair.length; j++) {
      const photo = pair[j];
      try {
        const imgEl = await loadImg(photo.url);
        const ratio = imgEl.width / imgEl.height;
        let renderW = maxW;
        let renderH = renderW / ratio;
        if (renderH > slotH) {
          renderH = slotH;
          renderW = renderH * ratio;
        }
        const x = (pageWidth - renderW) / 2;
        const y = margin + j * (slotH + (j === 0 ? gapY : 0)) + (slotH - renderH) / 2;
        pdf.addImage(imgEl, 'JPEG', x, y, renderW, renderH, '', 'FAST');
      } catch (e) { 
        console.warn('Image load failed', photo.url); 
      }
    }
  }

  onProgress?.('Uploading to Supabase...');

  // ------------- Upload to Supabase -------------
  const path = `${car.id}/vehicle-details-${Date.now()}.pdf`;
  const { error } = await supabase.storage.from('car-media').upload(path, pdf.output('blob'), {
    upsert: true,
    contentType: 'application/pdf'
  });
  
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('car-media').getPublicUrl(path);
  await supabase.from('cars').update({ vehicle_details_pdf_url: data.publicUrl }).eq('id', car.id);
  
  onProgress?.('PDF generated successfully!');
  return data.publicUrl;
} 