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

/**
 * Simplified PDF generation WITHOUT image loading for testing
 */
export async function generateCarPdf(car: CarForPdf, media: MediaRow[]) {
  console.log('Starting PDF generation for car:', car.id);
  
  try {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    console.log('PDF created, adding content...');

    // Set default font
    pdf.setFont('helvetica');
    
    // Add header (black background)
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, 80, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.text('Vehicle Quotation', 40, 50);
    pdf.setFontSize(16);
    pdf.text(`CHASSIS # ${car.chassis_number}`, 40, 70);

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
    
    console.log('Adding vehicle specs...');
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

    // Description (if exists)
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

    // Key equipment (if exists)
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

    console.log('PDF content added, uploading to Supabase...');

    // Upload to Supabase
    const path = `${car.id}/vehicle-details-simple-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('car-media').upload(path, pdf.output('blob'), {
      upsert: true,
      contentType: 'application/pdf'
    });
    
    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(error.message);
    }

    console.log('PDF uploaded successfully');

    const { data } = supabase.storage.from('car-media').getPublicUrl(path);
    await supabase.from('cars').update({ vehicle_details_pdf_url: data.publicUrl }).eq('id', car.id);
    
    console.log('PDF generation completed:', data.publicUrl);
    return data.publicUrl;
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
} 