import { NextRequest, NextResponse } from 'next/server';
import { generateRDPContent, validateXentryConfig } from '@/lib/xentryConfig';

export async function GET(request: NextRequest) {
  try {
    // Validate configuration
    const validation = validateXentryConfig();
    if (!validation.isValid) {
      console.error('XENTRY configuration validation failed:', validation.errors);
      return NextResponse.json(
        { 
          error: 'XENTRY configuration is incomplete',
          details: validation.errors 
        },
        { status: 500 }
      );
    }

    // Generate RDP file content using actual WorkSpace IP
    const rdpContent = generateRDPContent('172.31.17.45');

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
    console.error('Error generating RDP file:', error);
    return NextResponse.json(
      { error: 'Failed to generate RDP file' },
      { status: 500 }
    );
  }
}
