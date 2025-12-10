import { NextRequest, NextResponse } from 'next/server';

const PRICING_API_URL = process.env.MERCEDES_PRICING_API_URL || 'https://web-production-7c6c1.up.railway.app';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${PRICING_API_URL}/api/price/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch models' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Mercedes models error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
