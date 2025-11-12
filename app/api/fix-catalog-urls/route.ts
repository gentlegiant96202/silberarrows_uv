import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Get all catalog entries with old Supabase URLs
    const { data: catalogEntries, error: fetchError } = await supabase
      .from('uv_catalog')
      .select('id, catalog_image_url')
      .like('catalog_image_url', '%rrxfvdtubynlsanplbta.supabase.co%');

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch catalog entries' }, { status: 500 });
    }

    if (!catalogEntries || catalogEntries.length === 0) {
      return NextResponse.json({ 
        message: 'No catalog entries with old URLs found',
        updated: 0 
      });
    }
    // Update each entry
    let updatedCount = 0;
    for (const entry of catalogEntries) {
      if (entry.catalog_image_url) {
        const newUrl = entry.catalog_image_url.replace(
          'rrxfvdtubynlsanplbta.supabase.co', 
          'database.silberarrows.com'
        );

        const { error: updateError } = await supabase
          .from('uv_catalog')
          .update({ catalog_image_url: newUrl })
          .eq('id', entry.id);

        if (updateError) {
        } else {
          updatedCount++;
        }
      }
    }

    // Regenerate XML feed with updated URLs
    const xmlResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/generate-public-xml-feed`);
    
    if (xmlResponse.ok) {
    } else {
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} catalog image URLs`,
      totalFound: catalogEntries.length,
      updated: updatedCount,
      xmlRegenerated: xmlResponse.ok
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for easy browser testing
  return POST(request);
}
