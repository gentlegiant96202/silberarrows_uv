import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to validate user permissions
async function validateUserPermissions(request: NextRequest, requiredPermission: 'create') {
  try {
    // Get the Authorization header (sent by frontend)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Authorization header missing', status: 401 };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token using admin client
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { error: 'Invalid authorization token', status: 401 };
    }

    // Get user permissions for service module
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_module_permissions', {
        check_user_id: user.id,
        module_name: 'service'
      });

    if (permError) {
      return { error: 'Permission check failed', status: 500 };
    }

    const perms = permissions?.[0] || { can_create: false };
    
    if (!perms.can_create) {
      return { error: 'Insufficient permissions for create operation', status: 403 };
    }

    return { user, permissions: perms };
  } catch (error) {
    return { error: 'Permission validation failed', status: 500 };
  }
}

// Helper function to parse vehicle make from make_model string
function parseVehicleMake(vehicleMakeModel: string): string {
  if (!vehicleMakeModel) return '';
  
  if (vehicleMakeModel.toLowerCase().includes('mercedes')) {
    return 'Mercedes-Benz';
  } else if (vehicleMakeModel.toLowerCase().includes('bmw')) {
    return 'BMW';
  } else if (vehicleMakeModel.toLowerCase().includes('audi')) {
    return 'Audi';
  } else if (vehicleMakeModel.toLowerCase().includes('porsche')) {
    return 'Porsche';
  } else {
    // Fallback: return first word
    return vehicleMakeModel.split(' ')[0];
  }
}

// Helper function to parse vehicle model from make_model string
function parseVehicleModel(vehicleMakeModel: string): string {
  if (!vehicleMakeModel) return '';
  
  const make = parseVehicleMake(vehicleMakeModel);
  return vehicleMakeModel.replace(make, '').trim();
}

// Generate warranty contract reference number
function generateWarrantyReference(): string {
  const timestamp = Date.now().toString().slice(-5);
  const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `EW${timestamp}${random}`;
}

// POST - Create Extended Warranty contract from vehicle reservation
export async function POST(request: NextRequest) {
  // Validate create permissions
  const validation = await validateUserPermissions(request, 'create');
  if ('error' in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const body = await request.json();
    const { 
      reservation_id, 
      warranty_type = 'Extended', 
      coverage_months = 36,
      coverage_details = 'Engine, transmission, electrical systems, air conditioning, suspension components'
    } = body;

    if (!reservation_id) {
      return NextResponse.json(
        { error: 'reservation_id is required' },
        { status: 400 }
      );
    }
    // Get reservation data
    const { data: reservation, error: reservationError } = await supabase
      .from('vehicle_reservations')
      .select('*')
      .eq('id', reservation_id)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found', details: reservationError?.message },
        { status: 404 }
      );
    }
    // Check if Extended Warranty contract already exists for this reservation
    const { data: existingWarranty, error: existingError } = await supabase
      .from('warranty_contracts')
      .select('id, reference_no')
      .eq('reservation_id', reservation_id)
      .single();

    if (existingWarranty) {
      return NextResponse.json(
        { 
          error: 'Extended Warranty contract already exists for this reservation',
          existing_contract: existingWarranty
        },
        { status: 409 }
      );
    }

    // Parse vehicle make and model
    const vehicleMake = parseVehicleMake(reservation.vehicle_make_model);
    const vehicleModel = parseVehicleModel(reservation.vehicle_make_model);

    // Calculate contract dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + coverage_months);

    // Create Extended Warranty contract with auto-populated data
    const warrantyContractData = {
      reference_no: generateWarrantyReference(),
      contract_type: 'warranty',
      status: 'active',
      warranty_type: warranty_type, // 'Extended', 'Premium', 'Basic'
      
      // Customer information (auto-populated from reservation)
      owner_name: reservation.customer_name,
      mobile_no: reservation.contact_no,
      email: reservation.email_address,
      customer_id_type: reservation.customer_id_type,
      customer_id_number: reservation.customer_id_number,
      
      // Dealer information (default)
      dealer_name: 'SilberArrows',
      dealer_phone: '+971 4 380 5515',
      dealer_email: 'service@silberarrows.com',
      
      // Vehicle information (auto-populated from reservation)
      vin: reservation.chassis_no,
      make: vehicleMake,
      model: vehicleModel,
      model_year: reservation.model_year.toString(),
      current_odometer: reservation.vehicle_mileage.toString(),
      vehicle_colour: reservation.vehicle_colour,
      
      // Warranty specific fields
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      coverage_details: coverage_details,
      
      // Link to reservation
      reservation_id: reservation_id,
      
      // Audit fields
      created_by: validation.user.id
    };
    // Insert the warranty contract
    const { data: newContract, error: insertError } = await supabase
      .from('warranty_contracts')
      .insert(warrantyContractData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create Extended Warranty contract', details: insertError.message },
        { status: 500 }
      );
    }
    // Log activity
    try {
      await supabase
        .from('contract_activities')
        .insert({
          contract_id: newContract.id,
          contract_type: 'warranty',
          activity_type: 'created_from_reservation',
          activity_description: `Extended Warranty contract ${newContract.reference_no} created from reservation for ${reservation.customer_name}`,
          activity_data: {
            reservation_id: reservation_id,
            reservation_document_type: reservation.document_type,
            sales_executive: reservation.sales_executive,
            vehicle: `${vehicleMake} ${vehicleModel} (${reservation.model_year})`,
            warranty_type: warranty_type,
            coverage_months: coverage_months,
            auto_populated: true
          },
          created_by: validation.user.id
        });
    } catch (activityError) {
      // Continue without failing - contract was created successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Extended Warranty contract created successfully from reservation',
      contract: {
        id: newContract.id,
        reference_no: newContract.reference_no,
        warranty_type: newContract.warranty_type,
        customer_name: newContract.owner_name,
        vehicle: `${vehicleMake} ${vehicleModel}`,
        start_date: newContract.start_date,
        end_date: newContract.end_date,
        coverage_details: newContract.coverage_details,
        reservation_id: reservation_id
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to create Extended Warranty contract from reservation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
