import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.MERCEDES_PRICING_API_URL || 'https://web-production-7c6c1.up.railway.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { model, year, mileage, trim } = body;

    // Validate required fields
    if (!model || !year || mileage === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: model, year, mileage' },
        { status: 400 }
      );
    }

    // Build query params
    const params = new URLSearchParams({
      model: model,
      year: year.toString(),
      mileage: mileage.toString(),
    });
    
    if (trim) {
      params.append('trim', trim);
    }

    // Call pricing API
    const response = await fetch(
      `${PRICING_API_URL}/api/price?${params.toString()}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to get price estimate' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Mercedes pricing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support GET for simple queries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model = searchParams.get('model');
    const year = searchParams.get('year');
    const mileage = searchParams.get('mileage');
    const trim = searchParams.get('trim');

    if (!model || !year || !mileage) {
      return NextResponse.json(
        { error: 'Missing required params: model, year, mileage' },
        { status: 400 }
      );
    }

    const params = new URLSearchParams({
      model,
      year,
      mileage,
    });
    
    if (trim) {
      params.append('trim', trim);
    }

    const response = await fetch(
      `${PRICING_API_URL}/api/price?${params.toString()}`,
      { method: 'POST' }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to get price estimate' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Mercedes pricing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
