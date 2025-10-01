import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { 
      vehicle_model, 
      asking_price, 
      phone_number, 
      listing_url, 
      notes, 
      status = 'new_lead',
      extracted_from,
      extracted_at,
      site_domain
    } = await request.json();

    // Validate required fields
    if (!vehicle_model?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle model is required' },
        { status: 400 }
      );
    }

    // Prepare consignment data
    const consignmentData = {
      status: status || 'new_lead',
      phone_number: phone_number?.trim() || null,
      vehicle_model: vehicle_model.trim(),
      asking_price: asking_price ? parseInt(asking_price.toString().replace(/[^0-9]/g, ''), 10) : null,
      listing_url: listing_url?.trim() || null,
      notes: notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Note: Extraction metadata removed as requested

    console.log('Creating consignment from extension:', consignmentData);

    // Insert into database
    const { data, error } = await supabase
      .from('consignments')
      .insert([consignmentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating consignment:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create consignment: ' + error.message },
        { status: 500 }
      );
    }

    console.log('Consignment created successfully:', data);

    return NextResponse.json({
      success: true,
      consignment: data,
      message: 'Consignment created successfully'
    });

  } catch (error: any) {
    console.error('Error in consignment creation API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error: ' + (error.message || 'Unknown error')
      },
      { status: 500 }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
