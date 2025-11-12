const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    // Add archive column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE consignments ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;'
    });
    
    if (alterError) {
      return;
    }
    
    // Add index for better performance
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_consignments_archived ON consignments(archived);'
    });
    
    if (indexError) {
      return;
    }
    
    // Update existing consignments to be non-archived
    const { error: updateError } = await supabase
      .from('consignments')
      .update({ archived: false })
      .is('archived', null);
    
    if (updateError) {
      return;
    }
    // Verify the changes
    const { data, error: verifyError } = await supabase
      .from('consignments')
      .select('id, status, archived, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (verifyError) {
      return;
    }
  } catch (error) {
  }
}

runMigration();
