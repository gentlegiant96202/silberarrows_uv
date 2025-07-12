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

// Robust image loading with timeout
async function loadImageAsBase64(url: string, timeoutMs: number = 8000): Promise<string> {
  console.log('Loading image:', url);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PDF-Generator)' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) return '';
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    if (uint8Array.length > 3 * 1024 * 1024) return ''; // 3MB limit
    
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    
    console.log('Image loaded successfully');
    return `data:image/jpeg;base64,${btoa(binary)}`;
    
  } catch (error: any) {
    console.warn('Image load failed:', error.message);
    return '';
  }
}

// Draw premium glassy card background with multiple layers
function drawGlassyCard(pdf: jsPDF, x: number, y: number, width: number, height: number) {
  // Base card background with enhanced transparency
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(pdf.GState({ opacity: 0.12 }));
  pdf.roundedRect(x, y, width, height, 12, 12, 'F');
  
  // Secondary background layer for depth
  pdf.setGState(pdf.GState({ opacity: 0.06 }));
  pdf.roundedRect(x + 2, y + 2, width - 4, height - 4, 10, 10, 'F');
  
  // Main border with enhanced visibility
  pdf.setGState(pdf.GState({ opacity: 0.3 }));
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(1.5);
  pdf.roundedRect(x, y, width, height, 12, 12, 'S');
  
  // Inner border for additional depth
  pdf.setGState(pdf.GState({ opacity: 0.15 }));
  pdf.setLineWidth(0.8);
  pdf.roundedRect(x + 1.5, y + 1.5, width - 3, height - 3, 10.5, 10.5, 'S');
  
  // Subtle highlight on top edge
  pdf.setGState(pdf.GState({ opacity: 0.2 }));
  pdf.setLineWidth(1);
  pdf.line(x + 12, y, x + width - 12, y);
  
  // Reset opacity
  pdf.setGState(pdf.GState({ opacity: 1 }));
}

// Helper to format warranty/service text
function formatServiceText(text: string | null): string {
  if (!text) return '—';
  return text.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
             .replace(/Silberarrows/gi, 'SilberArrows');
}

// Calculate payment plans
function calculatePayments(price: number): string {
  if (!price) return '—';
  const r = 0.025 / 12;
  const n = 60;
  const calc = (pr: number) => Math.round(pr * r / (1 - Math.pow(1 + r, -n)));
  const m0 = calc(price);
  const m20 = calc(price * 0.8);
  return `0%: AED ${m0.toLocaleString()}/mo  |  20%: AED ${m20.toLocaleString()}/mo`;
}

// Calculate proper image dimensions maintaining aspect ratio
function calculateImageDimensions(containerWidth: number, containerHeight: number, targetAspectRatio: number = 16/9) {
  const containerAspectRatio = containerWidth / containerHeight;
  
  let imageWidth, imageHeight;
  
  if (containerAspectRatio > targetAspectRatio) {
    // Container is wider than target ratio - fit to height
    imageHeight = containerHeight;
    imageWidth = imageHeight * targetAspectRatio;
  } else {
    // Container is taller than target ratio - fit to width
    imageWidth = containerWidth;
    imageHeight = imageWidth / targetAspectRatio;
  }
  
  // Center the image in the container
  const x = (containerWidth - imageWidth) / 2;
  const y = (containerHeight - imageHeight) / 2;
  
  return { width: imageWidth, height: imageHeight, offsetX: x, offsetY: y };
}

/**
 * Generate beautiful PDF with glassy card design
 */
export async function generateCarPdf(car: CarForPdf, media: MediaRow[]) {
  console.log('Starting PDF generation with glassy design for car:', car.id);
  
  try {
    const photos = media.filter(m => m.kind === 'photo');
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // =============== PAGE 1: MAIN DESIGN ===============
    
    // Black background
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Header section
    const headerHeight = 90;
    pdf.setFillColor(0, 0, 0);
    pdf.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(32);
    pdf.text('Vehicle Quotation', 32, 45);
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`CHASSIS # (${car.chassis_number})`, 32, 70);
    
    // Load and add logo
    try {
      const logoBase64 = await loadImageAsBase64(
        'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png',
        5000
      );
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', pageWidth - 120, 25, 80, 40);
      }
    } catch (e) {
      console.warn('Logo load failed');
    }
    
    // Main content area starts below header
    const contentY = headerHeight + 32;
    
    // =============== SPECS CARD (Left) ===============
    const specsCardX = 32;
    const specsCardY = contentY;
    const specsCardWidth = (pageWidth - 96) * 0.45; // 45% width
    const specsCardHeight = 380;
    
    drawGlassyCard(pdf, specsCardX, specsCardY, specsCardWidth, specsCardHeight);
    
    // Specs content
    const specs = [
      ['Exterior Colour', car.colour],
      ['Interior Colour', car.interior_colour || '—'],
      ['Mileage', car.current_mileage_km ? `${car.current_mileage_km.toLocaleString()} km` : '—'],
      ['Regional Spec', car.regional_specification || '—'],
      ['Horsepower', car.horsepower_hp ? `${car.horsepower_hp} HP` : '—'],
      ['Torque', car.torque_nm ? `${car.torque_nm} Nm` : '—'],
      ['CC', car.cubic_capacity_cc ? `${car.cubic_capacity_cc} CC` : '—'],
      ['Engine', car.engine || '—'],
      ['Transmission', car.transmission || '—'],
      ['Warranty', formatServiceText(car.current_warranty)],
      ['Service', formatServiceText(car.current_service)],
      ['Price', `AED ${car.advertised_price_aed.toLocaleString()}`],
      ['Payment Plans', calculatePayments(car.advertised_price_aed)]
    ];
    
    let specY = specsCardY + 32;
    pdf.setFontSize(16);
    
    for (const [label, value] of specs) {
      // Label (muted)
      pdf.setTextColor(180, 180, 180);
      pdf.setFont('helvetica', 'normal');
      pdf.text(label, specsCardX + 24, specY);
      
      // Value (bright white)
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(value, specsCardWidth - 160);
      pdf.text(lines, specsCardX + 160, specY);
      
      specY += (lines.length * 18) + 8;
    }
    
    // =============== PHOTO CARD (Right) ===============
    const photoCardX = specsCardX + specsCardWidth + 32;
    const photoCardY = contentY;
    const photoCardWidth = pageWidth - photoCardX - 32;
    const photoCardHeight = specsCardHeight;
    
    drawGlassyCard(pdf, photoCardX, photoCardY, photoCardWidth, photoCardHeight);
    
    // Load and add first photo with proper aspect ratio
    if (photos.length > 0) {
      try {
        const imageBase64 = await loadImageAsBase64(photos[0].url, 10000);
        if (imageBase64) {
          // Calculate proper image dimensions maintaining aspect ratio
          const imgMargin = 12;
          const containerWidth = photoCardWidth - (imgMargin * 2);
          const containerHeight = photoCardHeight - (imgMargin * 2);
          
          const dimensions = calculateImageDimensions(containerWidth, containerHeight, 4/3); // 4:3 aspect ratio for cars
          
          const imgX = photoCardX + imgMargin + dimensions.offsetX;
          const imgY = photoCardY + imgMargin + dimensions.offsetY;
          
          pdf.addImage(imageBase64, 'JPEG', imgX, imgY, dimensions.width, dimensions.height);
          console.log('First photo added with proper aspect ratio');
        } else {
          // Placeholder if image fails
          pdf.setTextColor(150, 150, 150);
          pdf.setFontSize(14);
          pdf.text('Image Loading...', photoCardX + 24, photoCardY + photoCardHeight / 2);
        }
      } catch (e) {
        console.warn('First photo failed');
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(14);
        pdf.text('No Image Available', photoCardX + 24, photoCardY + photoCardHeight / 2);
      }
    }
    
    // =============== DESCRIPTION & EQUIPMENT CARD ===============
    const descCardY = contentY + specsCardHeight + 32;
    const descCardHeight = 200;
    
    if (car.description || car.key_equipment) {
      drawGlassyCard(pdf, 32, descCardY, pageWidth - 64, descCardHeight);
      
      let descY = descCardY + 32;
      
      // Description
      if (car.description) {
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.text('Description', 56, descY);
        descY += 24;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        const descLines = pdf.splitTextToSize(car.description, pageWidth - 128);
        pdf.text(descLines, 56, descY);
        descY += descLines.length * 14 + 20;
      }
      
      // Key Equipment
      if (car.key_equipment) {
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.text('Key Equipment', 56, descY);
        descY += 24;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        const equipItems = car.key_equipment.split(/[\n,]+/).map(item => item.trim()).filter(Boolean);
        const colWidth = (pageWidth - 128) / 2;
        let col1Y = descY;
        let col2Y = descY;
        
        equipItems.forEach((item, index) => {
          const isLeftColumn = index % 2 === 0;
          const x = isLeftColumn ? 72 : 72 + colWidth;
          const y = isLeftColumn ? col1Y : col2Y;
          
          pdf.text(`• ${item.charAt(0).toUpperCase() + item.slice(1).toLowerCase()}`, x, y);
          
          if (isLeftColumn) col1Y += 16;
          else col2Y += 16;
        });
      }
    }
    
    // =============== ADDITIONAL PHOTO PAGES ===============
    const remainingPhotos = photos.slice(1, 6); // Up to 5 additional photos
    console.log(`Processing ${remainingPhotos.length} additional photos...`);
    
    for (let i = 0; i < remainingPhotos.length; i += 2) {
      const photoPair = remainingPhotos.slice(i, i + 2);
      
      pdf.addPage();
      pdf.setFillColor(0, 0, 0);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      
      const margin = 40;
      const gap = 20;
      const availableHeight = pageHeight - (margin * 2);
      const photoHeight = photoPair.length === 2 
        ? (availableHeight - gap) / 2 
        : availableHeight;
      
      for (let j = 0; j < photoPair.length; j++) {
        const photo = photoPair[j];
        try {
          const imageBase64 = await loadImageAsBase64(photo.url, 12000);
          if (imageBase64) {
            const slotY = margin + j * (photoHeight + gap);
            const slotX = margin;
            const slotWidth = pageWidth - (margin * 2);
            
            // Calculate proper dimensions maintaining aspect ratio
            const dimensions = calculateImageDimensions(slotWidth, photoHeight, 16/9); // 16:9 aspect for full page photos
            
            const finalX = slotX + dimensions.offsetX;
            const finalY = slotY + dimensions.offsetY;
            
            pdf.addImage(imageBase64, 'JPEG', finalX, finalY, dimensions.width, dimensions.height);
            console.log(`Added photo ${i + j + 1} with proper aspect ratio`);
          }
        } catch (e) {
          console.warn(`Photo ${i + j + 1} failed to load`);
        }
      }
    }
    
    console.log('PDF generation completed, uploading...');
    
    // =============== UPLOAD TO SUPABASE ===============
    const path = `${car.id}/vehicle-details-glassy-${Date.now()}.pdf`;
    const { error } = await supabase.storage.from('car-media').upload(path, pdf.output('blob'), {
      upsert: true,
      contentType: 'application/pdf'
    });
    
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from('car-media').getPublicUrl(path);
    await supabase.from('cars').update({ vehicle_details_pdf_url: data.publicUrl }).eq('id', car.id);
    
    console.log('Beautiful PDF generated successfully:', data.publicUrl);
    return data.publicUrl;
    
  } catch (error) {
    console.error('PDF generation error:', error);
    throw error;
  }
} 