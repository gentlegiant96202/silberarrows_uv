-- Temporary fix: Disable RLS on sales tables for debugging
-- This should only be used temporarily to test functionality

-- Disable RLS on sales tables
ALTER TABLE sales_monthly_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_daily_inputs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_calculated_metrics DISABLE ROW LEVEL SECURITY;

SELECT 'RLS temporarily disabled on sales tables for debugging' as status;

-- To re-enable later, run:
-- ALTER TABLE sales_monthly_targets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales_daily_inputs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales_calculated_metrics ENABLE ROW LEVEL SECURITY; 