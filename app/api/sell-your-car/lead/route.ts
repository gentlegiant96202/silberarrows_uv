import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      phone,
      model,
      trim,
      year,
      mileage,
      offer_price,
      market_value,
      confidence,
      specs_used
    } = body;

    // Validate required fields
    if (!name || !phone || !model || !year || !mileage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('sell_car_leads')
      .insert({
        name,
        phone,
        model,
        trim: trim || null,
        year: parseInt(year),
        mileage: parseInt(String(mileage).replace(/,/g, '')),
        offer_price: offer_price || null,
        market_value: market_value || null,
        confidence: confidence || null,
        specs_used: specs_used || null,
        status: 'new',
        source: 'website',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save lead' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      lead_id: data.id 
    });

  } catch (error) {
    console.error('Lead API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
