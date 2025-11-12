import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// POST - Create ServiceCare contract from public Dubizzle portal (no auth required)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { type, ...contractData } = data;

    // Validate required fields
    const validationErrors: string[] = [];
    
    // Customer Information
    if (!contractData.owner_name?.trim()) validationErrors.push('Customer name is required');
    if (!contractData.mobile_no?.trim()) validationErrors.push('Mobile number is required');
    if (!contractData.email?.trim()) validationErrors.push('Email is required');
    if (!contractData.customer_id_type?.trim()) validationErrors.push('Customer ID type is required');
    if (!contractData.customer_id_number?.trim()) validationErrors.push('Customer ID number is required');
    
    // Vehicle Information
    if (!contractData.vin?.trim()) validationErrors.push('VIN is required');
    if (!contractData.make?.trim()) validationErrors.push('Vehicle make is required');
    if (!contractData.model?.trim()) validationErrors.push('Vehicle model is required');
    if (!contractData.model_year) validationErrors.push('Model year is required');
    if (!contractData.exterior_colour?.trim()) validationErrors.push('Exterior colour is required');
    if (!contractData.interior_colour?.trim()) validationErrors.push('Interior colour is required');
    if (!contractData.current_odometer) validationErrors.push('Current odometer is required');
    
    // Contract Details
    if (type === 'service' && !contractData.service_type?.trim()) {
      validationErrors.push('Service type is required');
    }
    if (!contractData.invoice_amount || parseFloat(contractData.invoice_amount) <= 0) {
      validationErrors.push('Invoice amount is required and must be greater than 0');
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    // For public contracts, use "Dubizzle Sales Team" as sales executive
    const contractWithSalesExec: any = {
      ...contractData,
      notes: contractData?.notes ?? null,
      sales_executive: contractData.sales_executive || 'Dubizzle Sales Team',
      workflow_status: 'created' // Default status
    };

    // Warranty-specific field mapping: service_type -> warranty_type
    if (type === 'warranty' && contractWithSalesExec?.service_type !== undefined) {
      contractWithSalesExec.warranty_type = contractWithSalesExec.service_type;
      delete contractWithSalesExec.service_type;
    }

    let result;
    
    if (type === 'service') {
      result = await supabaseAdmin
        .from('service_contracts')
        .insert(contractWithSalesExec)
        .select()
        .single();
    } else if (type === 'warranty') {
      result = await supabaseAdmin
        .from('warranty_contracts')
        .insert(contractWithSalesExec)
        .select()
        .single();
    } else {
      return NextResponse.json(
        { error: 'Invalid contract type. Use "service" or "warranty"' },
        { status: 400 }
      );
    }

    if (result.error) {
      return NextResponse.json(
        { error: 'Failed to create contract', details: result.error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      contract: result.data,
      message: `${type} contract created successfully`
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to create contract',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
