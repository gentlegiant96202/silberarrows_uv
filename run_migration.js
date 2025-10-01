const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('Running archive column migration...');
    
    // Add archive column
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE consignments ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;'
    });
    
    if (alterError) {
      console.error('Error adding archive column:', alterError);
      return;
    }
    
    // Add index for better performance
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: 'CREATE INDEX IF NOT EXISTS idx_consignments_archived ON consignments(archived);'
    });
    
    if (indexError) {
      console.error('Error creating index:', indexError);
      return;
    }
    
    // Update existing consignments to be non-archived
    const { error: updateError } = await supabase
      .from('consignments')
      .update({ archived: false })
      .is('archived', null);
    
    if (updateError) {
      console.error('Error updating existing consignments:', updateError);
      return;
    }
    
    console.log('✅ Archive column migration completed successfully!');
    
    // Verify the changes
    const { data, error: verifyError } = await supabase
      .from('consignments')
      .select('id, status, archived, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (verifyError) {
      console.error('Error verifying migration:', verifyError);
      return;
    }
    
    console.log('Sample data after migration:');
    console.table(data);
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();
