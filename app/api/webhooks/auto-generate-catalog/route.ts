import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Check if this is a new car insertion with inventory status
    const { type, record, old_record } = body;
    
    if (type === 'INSERT' && record?.status === 'inventory' && record?.sale_status === 'available') {
      console.log(`🔄 Auto-generating catalog image for new inventory car: ${record.stock_number}`);
      
      // Wait a few seconds to ensure any primary image uploads are complete
      setTimeout(async () => {
        try {
          // Check if car has a primary photo
          const { data: primaryPhoto } = await supabase
            .from('car_media')
            .select('url')
            .eq('car_id', record.id)
            .eq('kind', 'photo')
            .eq('is_primary', true)
            .single();

          if (primaryPhoto) {
            // Auto-generate catalog image
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-catalog-image/${record.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              console.log(`✅ Auto-generated catalog image for ${record.stock_number}`);
            } else {
              console.error(`❌ Failed to auto-generate catalog image for ${record.stock_number}`);
            }
          } else {
            console.log(`⏳ No primary photo yet for ${record.stock_number}, will try again later`);
          }
        } catch (error) {
          console.error(`Error auto-generating catalog image for ${record.stock_number}:`, error);
        }
      }, 5000); // Wait 5 seconds for image uploads to complete
    }

    // Also handle media uploads - generate catalog image when first photo is uploaded
    if (type === 'INSERT' && record?.kind === 'photo' && record?.is_primary === true) {
      console.log(`🖼️ Primary photo uploaded for car, generating catalog image...`);
      
      // Get car details
      const { data: car } = await supabase
        .from('cars')
        .select('id, stock_number, status, sale_status')
        .eq('id', record.car_id)
        .single();

      if (car && car.status === 'inventory' && car.sale_status === 'available') {
        // Auto-generate catalog image
        setTimeout(async () => {
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-catalog-image/${car.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (response.ok) {
              console.log(`✅ Auto-generated catalog image for ${car.stock_number} after photo upload`);
            } else {
              console.error(`❌ Failed to auto-generate catalog image for ${car.stock_number} after photo upload`);
            }
          } catch (error) {
            console.error(`Error auto-generating catalog image for ${car.stock_number}:`, error);
          }
        }, 2000); // Wait 2 seconds
      }
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Auto-generate catalog webhook error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Webhook processing failed' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Auto-generate catalog webhook endpoint',
    description: 'Automatically generates catalog images when cars are added to inventory'
  });
} 