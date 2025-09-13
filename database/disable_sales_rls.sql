-- Disable RLS on Sales Tables
-- Since permissions are handled on the frontend, no need for database-level RLS

-- Drop all existing policies
DROP POLICY IF EXISTS "sales_targets_policy" ON sales_monthly_targets;
DROP POLICY IF EXISTS "sales_inputs_policy" ON sales_daily_inputs;
DROP POLICY IF EXISTS "sales_calculations_policy" ON sales_calculated_metrics;
DROP POLICY IF EXISTS "sales_metrics_policy" ON sales_daily_metrics;

-- Disable RLS on all sales tables
ALTER TABLE sales_monthly_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_daily_inputs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_calculated_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_daily_metrics DISABLE ROW LEVEL SECURITY;

SELECT 'RLS disabled on all sales tables - permissions handled by frontend' as status; 