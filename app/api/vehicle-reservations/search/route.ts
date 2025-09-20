import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({ reservations: [] });
    }

    // Search vehicle reservations by customer name, mobile number, email, document number, or vehicle info
    const { data: reservations, error } = await supabase
      .from('vehicle_reservations')
      .select(`
        id,
        document_type,
        document_number,
        original_reservation_number,
        customer_name,
        contact_no,
        email_address,
        customer_id_type,
        customer_id_number,
        vehicle_make_model,
        model_year,
        chassis_no,
        vehicle_exterior_colour,
        vehicle_interior_colour,
        vehicle_mileage,
        manufacturer_warranty,
        manufacturer_warranty_expiry_date,
        manufacturer_warranty_expiry_mileage,
        dealer_service_package,
        dealer_service_package_expiry_date,
        dealer_service_package_expiry_mileage,
        extended_warranty,
        extended_warranty_price,
        service_care,
        service_care_price,
        ceramic_treatment,
        ceramic_treatment_price,
        window_tints,
        window_tints_price,
        vehicle_sale_price,
        invoice_total,
        document_date,
        sales_executive,
        created_at
      `)
      .or(`customer_name.ilike.%${query}%,contact_no.ilike.%${query}%,email_address.ilike.%${query}%,document_number.ilike.%${query}%,original_reservation_number.ilike.%${query}%,vehicle_make_model.ilike.%${query}%,chassis_no.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reservations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reservations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ reservations: reservations || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    // Fetch detailed reservation data for auto-population
    const { data: reservation, error } = await supabase
      .from('vehicle_reservations')
      .select('*')
      .eq('id', reservationId)
      .single();

    if (error || !reservation) {
      console.error('Error fetching reservation details:', error);
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ reservation });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
