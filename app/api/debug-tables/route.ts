import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const results: any = {};

    // Check if call_logs table exists
    try {
      const { count, error } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        results.callLogsExists = true;
        results.callLogsCount = count;
        
        // Get a sample record to see structure
        const { data: sampleData } = await supabase
          .from('call_logs')
          .select('*')
          .limit(1);
        
        if (sampleData && sampleData.length > 0) {
          results.callLogsColumns = Object.keys(sampleData[0]);
          results.callLogsSample = sampleData[0];
        } else {
          results.callLogsColumns = 'No data to determine structure';
        }
      } else {
        results.callLogsExists = false;
        results.callLogsError = error.message;
      }
    } catch (error) {
      results.callLogsExists = false;
      results.callLogsError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Check if call_management table exists
    try {
      const { count, error } = await supabase
        .from('call_management')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        results.callManagementExists = true;
        results.callManagementCount = count;
        
        // Get a sample record to see structure
        const { data: sampleData } = await supabase
          .from('call_management')
          .select('*')
          .limit(1);
        
        if (sampleData && sampleData.length > 0) {
          results.callManagementColumns = Object.keys(sampleData[0]);
          results.callManagementSample = sampleData[0];
        } else {
          results.callManagementColumns = 'No data to determine structure';
        }
      } else {
        results.callManagementExists = false;
        results.callManagementError = error.message;
      }
    } catch (error) {
      results.callManagementExists = false;
      results.callManagementError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Try some other possible table names
    const possibleTables = ['calls', 'call_entries', 'logs', 'call_log'];
    for (const tableName of possibleTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          results[`${tableName}Exists`] = true;
          results[`${tableName}Count`] = count;
        }
      } catch (error) {
        results[`${tableName}Exists`] = false;
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Database debug error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check database structure', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 