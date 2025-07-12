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

// Improved image loading with timeout and better error handling
async function loadImageAsBase64(url: string, timeoutMs: number = 5000): Promise<string> {
  console.log('Loading image:', url);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PDF-Generator)',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`Image fetch failed: ${response.status} ${response.statusText}`);
      return '';
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Limit image size to prevent memory issues
    if (uint8Array.length > 2 * 1024 * 1024) { // 2MB limit
      console.warn('Image too large, skipping:', url);
      return '';
    }
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    console.log('Image loaded successfully:', url.substring(0, 50) + '...');
    return `data:image/jpeg;base64,${base64}`;
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('Image load timeout:', url);
    } else {
      console.warn('Image load failed:', url, error.message);
    }
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
 * PDF generation with robust image loading
 */
export async function generateCarPdf(car: CarForPdf, media: MediaRow[]) {
  console.log('Starting PDF generation for car:', car.id);
  
  try {
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

    // Try to load and add logo (with timeout)
    try {
      const logoBase64 = await loadImageAsBase64(
        'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png',
        3000 // 3 second timeout for logo
      );
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', pageWidth - 120, 20, 80, 40);
        console.log('Logo added successfully');
      }
    } catch (e) {
      console.warn('Logo load failed, continuing without logo');
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

    // Try to add first photo on the first page
    if (photos.length > 0) {
      try {
        console.log('Loading first car photo...');
        const imageBase64 = await loadImageAsBase64(photos[0].url, 8000); // 8 second timeout
        if (imageBase64) {
          const imgWidth = 200;
          const imgHeight = 150;
          const imgX = pageWidth - imgWidth - 40;
          const imgY = 120;
          pdf.addImage(imageBase64, 'JPEG', imgX, imgY, imgWidth, imgHeight);
          console.log('First photo added successfully');
        } else {
          console.log('First photo could not be loaded, continuing without it');
        }
      } catch (e) {
        console.warn('First photo load failed:', e);
      }
    }

    // Description
    if (car.description) {
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('Description', 40, yPos);
      yPos += 20;
      
      pdf.setFontSize(10);
      const lines = pdf.splitTextToSize(car.description, pageWidth - 280); // Account for image space
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

    // Additional photos on new pages (load only first 4 additional photos)
    const remainingPhotos = photos.slice(1, 5); // Limit to 4 additional photos
    console.log(`Loading ${remainingPhotos.length} additional photos...`);
    
    for (let i = 0; i < remainingPhotos.length; i++) {
      const photo = remainingPhotos[i];
      try {
        const imageBase64 = await loadImageAsBase64(photo.url, 10000); // 10 second timeout
        if (imageBase64) {
          pdf.addPage();
          pdf.setFillColor(0, 0, 0);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          
          const margin = 40;
          const maxW = pageWidth - margin * 2;
          const maxH = pageHeight - margin * 2;
          
          pdf.addImage(imageBase64, 'JPEG', margin, margin, maxW, maxH);
          console.log(`Added photo ${i + 1}/${remainingPhotos.length}`);
        }
      } catch (e) {
        console.warn(`Photo ${i + 1} load failed:`, e);
      }
    }

    console.log('PDF content ready, uploading to Supabase...');

    // Upload to Supabase
    const path = `${car.id}/vehicle-details-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('car-media').upload(path, pdf.output('blob'), {
      upsert: true,
      contentType: 'application/pdf'
    });
    
    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from('car-media').getPublicUrl(path);
    await supabase.from('cars').update({ vehicle_details_pdf_url: data.publicUrl }).eq('id', car.id);
    
    console.log('PDF generation completed successfully:', data.publicUrl);
    return data.publicUrl;
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
} 