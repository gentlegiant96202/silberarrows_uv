import jsPDF from 'jspdf';
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

// Helper to load image as base64 for PDF embedding
async function loadImageAsBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 without spread operator (TypeScript compatibility)
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.warn('Failed to load image:', url, error);
    return '';
  }
}

// Helper to chunk an array
function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

/**
 * Serverless-friendly PDF generation using jsPDF directly
 */
export async function generateCarPdf(car: CarForPdf, media: MediaRow[]) {
  const photos = media.filter(m => m.kind === 'photo');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Set default font
  pdf.setFont('helvetica');
  
  // Add header
  pdf.setFillColor(0, 0, 0);
  pdf.rect(0, 0, pageWidth, 80, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.text('Vehicle Quotation', 40, 50);
  pdf.setFontSize(16);
  pdf.text(`CHASSIS # ${car.chassis_number}`, 40, 70);

  // Add SilberArrows logo (if available)
  try {
    const logoBase64 = await loadImageAsBase64('https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png');
    if (logoBase64) {
      pdf.addImage(logoBase64, 'PNG', pageWidth - 120, 20, 80, 40);
    }
  } catch (e) {
    console.warn('Logo load failed');
  }

  // Vehicle details section
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(18);
  pdf.text('Vehicle Details', 40, 120);
  
  const specs = [
    ['Model', `${car.model_year} ${car.vehicle_model}`],
    ['Exterior Colour', car.colour],
    ['Interior Colour', car.interior_colour || '—'],
    ['Mileage', car.current_mileage_km ? `${car.current_mileage_km.toLocaleString()} km` : '—'],
    ['Regional Spec', car.regional_specification || '—'],
    ['Horsepower', car.horsepower_hp ? `${car.horsepower_hp} HP` : '—'],
    ['Torque', car.torque_nm ? `${car.torque_nm} Nm` : '—'],
    ['Engine', car.engine || '—'],
    ['Transmission', car.transmission || '—'],
    ['Price', `AED ${car.advertised_price_aed.toLocaleString()}`],
  ];

  let yPos = 140;
  pdf.setFontSize(12);
  
  for (const [label, value] of specs) {
    pdf.setTextColor(100, 100, 100);
    pdf.text(label + ':', 40, yPos);
    pdf.setTextColor(0, 0, 0);
    pdf.text(value, 200, yPos);
    yPos += 20;
  }

  // Payment plans calculation
  const p = car.advertised_price_aed || 0;
  if (p > 0) {
    const r = 0.025 / 12;
    const n = 60;
    const calc = (pr: number) => Math.round(pr * r / (1 - Math.pow(1 + r, -n)));
    const m0 = calc(p);
    const m20 = calc(p * 0.8);
    
    pdf.setTextColor(100, 100, 100);
    pdf.text('Payment Plans:', 40, yPos);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`0%: AED ${m0.toLocaleString()}/mo | 20%: AED ${m20.toLocaleString()}/mo`, 200, yPos);
    yPos += 30;
  }

  // Add first photo if available
  if (photos.length > 0) {
    try {
      const imageBase64 = await loadImageAsBase64(photos[0].url);
      if (imageBase64) {
        const imgWidth = 200;
        const imgHeight = 150;
        const imgX = pageWidth - imgWidth - 40;
        const imgY = 120;
        pdf.addImage(imageBase64, 'JPEG', imgX, imgY, imgWidth, imgHeight);
      }
    } catch (e) {
      console.warn('Photo load failed:', photos[0].url);
    }
  }

  // Description
  if (car.description) {
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Description', 40, yPos);
    yPos += 20;
    
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(car.description, pageWidth - 80);
    pdf.text(lines, 40, yPos);
    yPos += lines.length * 12 + 20;
  }

  // Key equipment
  if (car.key_equipment) {
    pdf.setFontSize(14);
    pdf.text('Key Equipment', 40, yPos);
    yPos += 20;
    
    pdf.setFontSize(10);
    const equipItems = car.key_equipment.split(/[\n,]+/).map(item => item.trim()).filter(Boolean);
    equipItems.forEach(item => {
      pdf.text('• ' + item, 50, yPos);
      yPos += 15;
    });
  }

  // Additional photos on new pages
  const remainingPhotos = photos.slice(1);
  const photoPairs = chunk(remainingPhotos, 2);
  
  for (const pair of photoPairs) {
    if (pair.length === 0) continue;
    
    pdf.addPage();
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    const margin = 40;
    const gapY = 20;
    const slotH = (pageHeight - margin * 2 - (pair.length === 2 ? gapY : 0)) / pair.length;
    const maxW = pageWidth - margin * 2;
    
    for (let i = 0; i < pair.length; i++) {
      const photo = pair[i];
      try {
        const imageBase64 = await loadImageAsBase64(photo.url);
        if (imageBase64) {
          const imgW = maxW;
          const imgH = slotH - 20;
          const x = margin;
          const y = margin + i * (slotH + (i === 0 ? gapY : 0));
          pdf.addImage(imageBase64, 'JPEG', x, y, imgW, imgH);
        }
      } catch (e) {
        console.warn('Photo load failed:', photo.url);
      }
    }
  }

  // Upload to Supabase
  const path = `${car.id}/vehicle-details-${Date.now()}.pdf`;
  const { error } = await supabase.storage.from('car-media').upload(path, pdf.output('blob'), {
    upsert: true,
    contentType: 'application/pdf'
  });
  
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('car-media').getPublicUrl(path);
  await supabase.from('cars').update({ vehicle_details_pdf_url: data.publicUrl }).eq('id', car.id);
  
  return data.publicUrl;
} 