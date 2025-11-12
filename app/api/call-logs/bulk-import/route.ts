import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to clean and validate time format
function cleanTimeFormat(timeStr: string): string | null {
  if (!timeStr || timeStr.trim() === '') {
    return null; // Return null for empty times
  }
  
  // Replace invalid characters with valid ones
  let cleanTime = timeStr
    .replace(/[!]/g, '1') // Replace ! with 1
    .replace(/[\$]/g, '5') // Replace $ with 5
    .replace(/[^0-9:]/g, '') // Remove any other non-digit, non-colon characters
    .trim();
  
  // Ensure format is HH:MM
  if (cleanTime.length === 4 && cleanTime.indexOf(':') === -1) {
    // Format like "1530" -> "15:30"
    cleanTime = cleanTime.slice(0, 2) + ':' + cleanTime.slice(2);
  }
  
  // Validate time format HH:MM
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (timeRegex.test(cleanTime)) {
    return cleanTime + ':00'; // Add seconds for PostgreSQL TIME format
  }
  
  // If still invalid, return null
  return null;
}

// POST: Bulk import call log entries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries)) {
      return NextResponse.json(
        { error: 'Invalid request: entries array is required' },
        { status: 400 }
      );
    }
    // Transform entries to match database schema
    const insertData = entries.map(entry => ({
      record_type: 'call_entry',
      call_date: entry.call_date,
      call_time: cleanTimeFormat(entry.call_time), // Clean the time format
      customer_name: entry.customer_name,
      phone_number: entry.phone_number,
      reach_out_method: entry.reach_out_method || 'Call',
      person_in_charge: entry.person_in_charge,
      answered_yn: entry.answered_yn || 'Yes',
      action_taken: entry.action_taken,
      person_in_charge_2: entry.person_in_charge_2 || null,
      answered_yn_2: entry.answered_yn_2 || null,
      notes: entry.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Process in batches to avoid overwhelming the database
    const batchSize = 1000; // Larger batches for bulk insert
    let totalInserted = 0;
    const errors = [];

    for (let i = 0; i < insertData.length; i += batchSize) {
      const batch = insertData.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('call_management')
          .insert(batch)
          .select('id');

        if (error) {
          errors.push({
            batch: i / batchSize + 1,
            error: error.message,
            entries: batch.length
          });
        } else {
          totalInserted += data?.length || batch.length;
        }
      } catch (batchError) {
        errors.push({
          batch: i / batchSize + 1,
          error: `Exception: ${batchError}`,
          entries: batch.length
        });
      }
    }

    const response = {
      success: true,
      totalEntries: entries.length,
      successCount: totalInserted,
      failedCount: entries.length - totalInserted,
      errors: errors.length > 0 ? errors : undefined,
      message: `Bulk import completed: ${totalInserted}/${entries.length} entries inserted successfully`
    };
    if (errors.length > 0) {
      return NextResponse.json(response, { status: 207 }); // Multi-status
    }

    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Bulk import failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 