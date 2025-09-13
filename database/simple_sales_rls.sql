-- Simple Sales RLS Policies
-- Use basic authenticated user approach until we know the exact permission structure

-- Drop existing policies
DROP POLICY IF EXISTS "sales_targets_policy" ON sales_monthly_targets;
DROP POLICY IF EXISTS "sales_inputs_policy" ON sales_daily_inputs;
DROP POLICY IF EXISTS "sales_calculations_policy" ON sales_calculated_metrics;
DROP POLICY IF EXISTS "sales_metrics_policy" ON sales_daily_metrics;

-- Enable RLS on all sales tables
ALTER TABLE sales_monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_daily_metrics ENABLE ROW LEVEL SECURITY;

-- Create simple policies for authenticated users
-- These can be refined later once we know the permission structure

-- Allow all authenticated users to access sales targets
CREATE POLICY "sales_targets_policy" ON sales_monthly_targets FOR ALL USING (
    auth.role() = 'authenticated'
);

-- Allow all authenticated users to access sales metrics
CREATE POLICY "sales_metrics_policy" ON sales_daily_metrics FOR ALL USING (
    auth.role() = 'authenticated'
);

SELECT 'Simple RLS policies created for authenticated users' as status; 