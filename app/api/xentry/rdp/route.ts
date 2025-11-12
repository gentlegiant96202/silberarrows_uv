import { NextRequest, NextResponse } from 'next/server';
import { generateRDPContent } from '@/lib/xentryConfig';

export async function GET(request: NextRequest) {
  try {
    // Generate RDP file content using localhost for testing
    // This will help test if RDP service is working
    const rdpContent = generateRDPContent('localhost');

    // Set headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/rdp');
    headers.set('Content-Disposition', 'attachment; filename="XENTRY-UK-Desktop.rdp"');
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    return new NextResponse(rdpContent, {
      status: 200,
      headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate RDP file' },
      { status: 500 }
    );
  }
}
