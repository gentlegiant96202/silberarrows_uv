import { NextRequest, NextResponse } from 'next/server';
import { generateCarPdf } from '@/lib/generateCarPdf-glassy';

// Use Edge Runtime for better Canvas support
export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    console.log('PDF API route called');
    const { car, media } = await req.json();
    console.log('Car data received:', car?.id, car?.vehicle_model);
    
    // Generate PDF
    const pdfUrl = await generateCarPdf(car, media);
    console.log('PDF generated successfully:', pdfUrl);
    
    return NextResponse.json({ success: true, pdfUrl });
  } catch (error: any) {
    console.error('PDF generation error:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'PDF generation failed',
        details: error?.stack 
      }, 
      { status: 500 }
    );
  }
} 