import { NextRequest, NextResponse } from 'next/server';

/**
 * Leasing-specific conversion tracking endpoint
 * Only handles conversions from /leasing/showroom section
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      conversionAction, 
      conversionValue, 
      gclid, 
      conversionDateTime,
      vehicleData,
      source 
    } = body;

    // Verify this is from leasing section
    if (source !== 'leasing_showroom') {
      return NextResponse.json(
        { error: 'Invalid source - this endpoint is for leasing conversions only' },
        { status: 403 }
      );
    }

    if (!gclid) {
      return NextResponse.json(
        { error: 'GCLID is required for conversion tracking' },
        { status: 400 }
      );
    }

    // Get credentials from environment variables
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;

    if (!customerId || !developerToken || !accessToken) {
      console.error('Missing Google Ads credentials');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Map conversion action to conversion action ID
    const conversionActionMap: Record<string, string> = {
      'PHONE_CALL': process.env.CONVERSION_ACTION_PHONE_CALL || '',
      'WHATSAPP': process.env.CONVERSION_ACTION_WHATSAPP || '',
      'VEHICLE_VIEW': process.env.CONVERSION_ACTION_VEHICLE_VIEW || '',
      'PAGE_VIEW': process.env.CONVERSION_ACTION_PAGE_VIEW || '',
    };

    const conversionActionId = conversionActionMap[conversionAction];

    if (!conversionActionId) {
      return NextResponse.json(
        { error: `Unknown conversion action: ${conversionAction}` },
        { status: 400 }
      );
    }

    // Google Ads API endpoint
    const response = await fetch(
      `https://googleads.googleapis.com/v16/customers/${customerId}:uploadClickConversions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'developer-token': developerToken,
          'login-customer-id': customerId,
        },
        body: JSON.stringify({
          conversions: [
            {
              gclid: gclid,
              conversionAction: `customers/${customerId}/conversionActions/${conversionActionId}`,
              conversionDateTime: conversionDateTime || new Date().toISOString(),
              conversionValue: conversionValue || 0,
              currencyCode: 'AED',
              // Optional: Add custom variables for enhanced tracking
              ...(vehicleData && {
                customVariables: [
                  {
                    conversionCustomVariable: 'vehicle_id',
                    value: vehicleData.vehicleId || '',
                  },
                  {
                    conversionCustomVariable: 'vehicle_make',
                    value: vehicleData.make || '',
                  },
                  {
                    conversionCustomVariable: 'vehicle_model',
                    value: vehicleData.model || '',
                  },
                ],
              }),
            },
          ],
          partialFailure: true,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Google Ads API Error:', data);
      return NextResponse.json(
        { error: 'Failed to track conversion', details: data },
        { status: 500 }
      );
    }

    console.log('Leasing conversion tracked successfully:', {
      action: conversionAction,
      value: conversionValue,
      vehicle: vehicleData,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Leasing conversion tracked successfully',
      data 
    });
  } catch (error) {
    console.error('Leasing conversion tracking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

