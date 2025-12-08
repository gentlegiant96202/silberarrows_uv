import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to validate user permissions
async function validateUserPermissions(request: NextRequest, requiredPermission: 'view') {
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

    // Check permissions for both CRM (to view reservations) and service (to view contracts)
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_module_permissions', {
        check_user_id: user.id,
        module_name: 'service' // Primary check for service module
      });

    if (permError) {
      return { error: 'Permission check failed', status: 500 };
    }

    const perms = permissions?.[0] || { can_view: false };
    
    if (!perms.can_view) {
      return { error: 'Insufficient permissions for view operation', status: 403 };
    }

    return { user, permissions: perms };
  } catch (error) {
    return { error: 'Permission validation failed', status: 500 };
  }
}

// GET - Get linked service and warranty contracts for a vehicle reservation
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Validate view permissions
  const validation = await validateUserPermissions(request, 'view');
  if ('error' in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const { id } = await params;
    const reservationId = id;
    // First verify the reservation exists and get its details
    const { data: reservation, error: reservationError } = await supabase
      .from('vehicle_reservations')
      .select(`
        id,
        customer_name,
        vehicle_make_model,
        model_year,
        chassis_no,
        document_type,
        sales_executive,
        created_at,
        service_care,
        service_care_price,
        extended_warranty,
        extended_warranty_price
      `)
      .eq('id', reservationId)
      .single();

    if (reservationError || !reservation) {
      return NextResponse.json(
        { error: 'Reservation not found', details: reservationError?.message },
        { status: 404 }
      );
    }

    // Get linked service contracts
    const { data: serviceContracts, error: serviceError } = await supabase
      .from('service_contracts')
      .select(`
        id,
        reference_no,
        service_type,
        status,
        workflow_status,
        owner_name,
        mobile_no,
        email,
        vin,
        make,
        model,
        model_year,
        current_odometer,
        vehicle_colour,
        start_date,
        end_date,
        cut_off_km,
        invoice_amount,
        pdf_url,
        created_at,
        updated_at
      `)
      .eq('reservation_id', reservationId);

    if (serviceError) {
    }

    // Get linked warranty contracts
    const { data: warrantyContracts, error: warrantyError } = await supabase
      .from('warranty_contracts')
      .select(`
        id,
        reference_no,
        warranty_type,
        status,
        workflow_status,
        owner_name,
        mobile_no,
        email,
        vin,
        make,
        model,
        model_year,
        current_odometer,
        vehicle_colour,
        start_date,
        end_date,
        coverage_details,
        pdf_url,
        created_at,
        updated_at
      `)
      .eq('reservation_id', reservationId);

    if (warrantyError) {
    }

    // Add calculated fields to contracts
    const processContracts = (contracts: any[]) => {
      return contracts?.map(contract => {
        const endDate = new Date(contract.end_date);
        const currentDate = new Date();
        
        // Calculate days until expiry
        const timeDiff = endDate.getTime() - currentDate.getTime();
        const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
        
        // Determine contract health
        let contractHealth = 'Active';
        if (endDate < currentDate) {
          contractHealth = 'Expired';
        } else if (daysUntilExpiry <= 30) {
          contractHealth = 'Expiring Soon';
        }

        return {
          ...contract,
          contract_health: contractHealth,
          days_until_expiry: daysUntilExpiry,
          formatted_start_date: new Date(contract.start_date).toLocaleDateString('en-GB'),
          formatted_end_date: new Date(contract.end_date).toLocaleDateString('en-GB'),
          vehicle_info: `${contract.make} ${contract.model} (${contract.model_year})`
        };
      }) || [];
    };

    const processedServiceContracts = processContracts(serviceContracts || []);
    const processedWarrantyContracts = processContracts(warrantyContracts || []);
    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        customer_name: reservation.customer_name,
        vehicle: reservation.vehicle_make_model,
        model_year: reservation.model_year,
        chassis_no: reservation.chassis_no,
        document_type: reservation.document_type,
        sales_executive: reservation.sales_executive,
        created_at: reservation.created_at,
        // Show what add-ons were selected in original reservation
        add_ons: {
          service_care: reservation.service_care,
          service_care_price: reservation.service_care_price,
          extended_warranty: reservation.extended_warranty,
          extended_warranty_price: reservation.extended_warranty_price
        }
      },
      contracts: {
        service_contracts: processedServiceContracts,
        warranty_contracts: processedWarrantyContracts,
        total_contracts: processedServiceContracts.length + processedWarrantyContracts.length
      },
      summary: {
        has_service_care: processedServiceContracts.length > 0,
        has_extended_warranty: processedWarrantyContracts.length > 0,
        contracts_created_from_reservation: true,
        integration_status: 'active'
      }
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch reservation contracts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
