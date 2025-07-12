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

export interface MediaRow { id:string; url:string; kind:'photo'|'video'|'document'; }

// utility to build a hidden DOM node and rasterise to img
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
  document.body.appendChild(wrapper);

  const canvas = await html2canvas(wrapper, {
    scale: 1,
    useCORS: true,
    backgroundColor: '#000',
    imageTimeout: 0,
  });
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  document.body.removeChild(wrapper);
  return { imgData, width: canvas.width, height: canvas.height };
}

// helper to chunk an array
function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

// helper to load an image element for high-quality embedding
async function loadImg(src:string):Promise<HTMLImageElement>{
  return new Promise((res,rej)=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=>res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/**
 * Builds a one-page A4 PDF containing car details and up to 6 photos, uploads it
 * to Supabase Storage, and writes the public URL back to the `cars` table.
 * Returns the public URL or throws on error.
 */
export async function generateCarPdf(car: CarForPdf, media: MediaRow[]) {
  const photos = media.filter(m => m.kind === 'photo');

  // ------------- Build first page with glassy cards & photo -------------
  const firstPhotoUrl = photos[0]?.url || '';

  const cardStyle = 'background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:24px;backdrop-filter:blur(6px);';

  const specsGrid = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;font-size:18px">
        <div style="opacity:.7">Exterior Colour</div><div>${car.colour}</div>
        <div style="opacity:.7">Interior Colour</div><div>${car.interior_colour ?? '—'}</div>
        <div style="opacity:.7">Mileage</div><div>${car.current_mileage_km?.toLocaleString() ?? '—'} km</div>
        <div style="opacity:.7">Regional Spec</div><div>${car.regional_specification ?? '—'}</div>
        <div style="opacity:.7">Horsepower</div><div>${car.horsepower_hp ? car.horsepower_hp + ' HP' : '—'}</div>
        <div style="opacity:.7">Torque</div><div>${car.torque_nm ? car.torque_nm + ' Nm' : '—'}</div>
        <div style="opacity:.7">CC</div><div>${car.cubic_capacity_cc ? car.cubic_capacity_cc + ' CC' : '—'}</div>
        <div style="opacity:.7">Engine</div><div>${car.engine ?? '—'}</div>
        <div style="opacity:.7">Transmission</div><div>${car.transmission ?? '—'}</div>
        <div style="opacity:.7">Warranty</div><div>${car.current_warranty ? car.current_warranty.replace(/\b\w+/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).replace(/Silberarrows/gi,'SilberArrows') : '—'}</div>
        <div style="opacity:.7">Service</div><div>${car.current_service ? car.current_service.replace(/\b\w+/g,w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).replace(/Silberarrows/gi,'SilberArrows') : '—'}</div>
        <div style="opacity:.7">Price</div><div>AED ${car.advertised_price_aed.toLocaleString()}</div>
        <div style="opacity:.7">Payment Plans</div><div>${(()=>{ const p=car.advertised_price_aed||0; if(!p) return '—'; const r=0.025/12; const n=60; const calc=(pr: number)=>Math.round(pr*r/(1-Math.pow(1+r,-n))).toLocaleString(); const m0=calc(p); const m20=calc(p*0.8); return `0%: AED ${m0}/mo  |  20%: AED ${m20}/mo`;})()}</div>
      </div>`;

  const descHtml = car.description ? `<h2 style="margin:0 0 12px;font-size:24px;font-weight:700">Description</h2><p style="white-space:pre-wrap;line-height:1.6;font-size:16px">${car.description}</p>` : '';
  const equipItems = car.key_equipment ? car.key_equipment.split(/[\n,]+/).map(item=>item.trim()) : [];
  const toTitle=(s:string)=>s.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase());
  const equipHtml = equipItems.length ? `<h2 style="margin:24px 0 12px;font-size:24px;font-weight:700">Key Equipment</h2><ul style="margin:0;padding:0;list-style:disc inside;list-style-position:inside;columns:2 auto;column-gap:24px;line-height:1.5;font-size:16px">${equipItems.map(item=>`<li style=\"break-inside:avoid-column;\">${toTitle(item)}</li>`).join('')}</ul>` : '';

  const firstHtml = `
    <!-- Header -->
    <div style="display:flex;align-items:center;margin:-32px -32px 24px -32px;padding:20px 32px;background:#000;">
      <div style="font-size:38px;font-weight:700;color:#fff;line-height:1;">Vehicle Quotation – CHASSIS # (${car.chassis_number})</div>
      <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" style="height:70px;width:auto;object-fit:contain;margin-left:auto;margin-top:14px;" />
    </div>

    <!-- Main grid -->
    <div style="display:grid;grid-template-columns:0.7fr 1.3fr;gap:24px;margin-bottom:24px;align-items:start;">
      <!-- Specs Card -->
      <div style="${cardStyle}">
        ${specsGrid}
      </div>

      <!-- Photo Card -->
      <div style="${cardStyle}padding:0;display:flex;flex-direction:column;height:100%;align-self:stretch;overflow:hidden;">
        ${firstPhotoUrl ? `<img src="${firstPhotoUrl}" style="flex:1;width:100%;object-fit:cover;" />` : '<span style="color:#888;font-size:14px;">No Image</span>'}
      </div>
    </div>

    <!-- Description & Equipment Card -->
    <div style="${cardStyle}margin-bottom:24px;">
      ${descHtml}
      ${equipHtml}
    </div>
  `;

  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const firstImg = await htmlToImage(firstHtml);
  pdf.setFillColor(0,0,0); pdf.rect(0,0,pageWidth,pageHeight,'F');
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
  const photoPairs = chunk(photos,2);
  for(const pair of photoPairs){
    if(pair.length===0) continue;
    pdf.addPage();
    // fill black background
    pdf.setFillColor(0,0,0);
    pdf.rect(0,0,pageWidth,pageHeight,'F');

    const margin = 20;
    const gapY = 20;
    const slotH = (pageHeight - margin*2 - (pair.length===2?gapY:0)) / pair.length;
    const maxW = pageWidth - margin*2;

    for(let i=0;i<pair.length;i++){
      const photo = pair[i];
      try{
        const imgEl = await loadImg(photo.url);
        const ratio = imgEl.width/imgEl.height;
        let renderW = maxW;
        let renderH = renderW/ratio;
        if(renderH > slotH){
          renderH = slotH;
          renderW = renderH*ratio;
        }
        const x = (pageWidth - renderW)/2;
        const y = margin + i*(slotH + (i===0?gapY:0)) + (slotH - renderH)/2;
        pdf.addImage(imgEl,'JPEG',x,y,renderW,renderH,'','FAST');
      }catch(e){ console.warn('img load failed',photo.url); }
    }
  }

  // ------------- Upload to Supabase -------------
  const path = `${car.id}/vehicle-details-${Date.now()}.pdf`;
  console.time('supabase-upload');
  const { error } = await supabase.storage.from('car-media').upload(path, pdf.output('blob'), {
    upsert: true,
    contentType: 'application/pdf'
  });
  console.timeEnd('supabase-upload');
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('car-media').getPublicUrl(path);
  await supabase.from('cars').update({ vehicle_details_pdf_url: data.publicUrl }).eq('id', car.id);
  return data.publicUrl;
} // TypeScript fix applied
