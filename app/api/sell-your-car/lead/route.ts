import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const WEBHOOK_URL = 'https://bothook.io/v1/public/triggers/webhooks/19140ecb-caa5-4282-acf2-0a9c95026555';

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
      specs_used,
      consignment_price,
      consignment_commission
    } = body;

    // Validate required fields
    if (!name || !phone || !model || !year || !mileage) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const parsedYear = parseInt(year);
    const parsedMileage = parseInt(String(mileage).replace(/,/g, ''));

    // Insert into Supabase
    const { data, error } = await supabaseAdmin
      .from('sell_car_leads')
      .insert({
        name,
        phone,
        model,
        trim: trim || null,
        year: parsedYear,
        mileage: parsedMileage,
        offer_price: offer_price || null,
        market_value: market_value || null,
        confidence: confidence || null,
        specs_used: specs_used || null,
        consignment_price: consignment_price || null,
        consignment_commission: consignment_commission || null,
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

    // Send webhook notification
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: data.id,
          name,
          phone,
          model,
          trim: trim || null,
          year: parsedYear,
          mileage: parsedMileage,
          cash_offer: offer_price || null,
          consignment_offer: consignment_price || null,
          market_value: market_value || null,
          confidence: confidence || null,
          source: 'website',
          timestamp: new Date().toISOString()
        })
      });
    } catch (webhookError) {
      // Log but don't fail the request if webhook fails
      console.error('Webhook error:', webhookError);
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
