const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    // Check latest sales record
    const { data: latest, error: latestError } = await supabase
      .from('sales_daily_metrics')
      .select('*')
      .order('metric_date', { ascending: false })
      .limit(1);
    
    console.log('Latest record:', JSON.stringify(latest, null, 2));
    if (latestError) console.log('Latest error:', latestError);
    
    // Check August 2025 targets
    const { data: targets, error: targetsError } = await supabase
      .from('sales_monthly_targets')
      .select('*')
      .eq('year', 2025)
      .eq('month', 8);
    
    console.log('August targets:', JSON.stringify(targets, null, 2));
    if (targetsError) console.log('Targets error:', targetsError);
    
    // Check if trigger function exists
    const { data: functions, error: funcError } = await supabase
      .rpc('exec_sql', { 
        sql: "SELECT proname FROM pg_proc WHERE proname = 'calculate_sales_metrics_on_upsert';" 
      });
    
    console.log('Trigger function exists:', functions);
    if (funcError) console.log('Function check error:', funcError);
    
  } catch (error) {
    console.error('Script error:', error);
  }
})(); 