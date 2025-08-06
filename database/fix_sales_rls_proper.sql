-- Proper fix for Sales RLS - Re-enable with working policies

-- Re-enable RLS on sales tables
ALTER TABLE sales_monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_calculated_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "sales_targets_policy" ON sales_monthly_targets;
DROP POLICY IF EXISTS "sales_inputs_policy" ON sales_daily_inputs;
DROP POLICY IF EXISTS "sales_calculations_policy" ON sales_calculated_metrics;

-- Create more permissive policies that should work
-- Allow all authenticated users with any accounts module permission

CREATE POLICY "sales_targets_policy" ON sales_monthly_targets FOR ALL USING (
    auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
            WHERE can_view = true OR can_edit = true
        )
        OR 
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND module_name = 'accounts'
        )
    )
);

CREATE POLICY "sales_inputs_policy" ON sales_daily_inputs FOR ALL USING (
    auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
            WHERE can_view = true OR can_edit = true
        )
        OR 
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND module_name = 'accounts'
        )
    )
);

CREATE POLICY "sales_calculations_policy" ON sales_calculated_metrics FOR ALL USING (
    auth.role() = 'authenticated' AND (
        EXISTS (
            SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
            WHERE can_view = true OR can_edit = true
        )
        OR 
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND (module_name = 'accounts' OR module_name = 'uv_crm')
        )
    )
);

-- Check if targets are visible now
SELECT 
    'Checking targets visibility' as test,
    COUNT(*) as target_count 
FROM sales_monthly_targets;

SELECT 'Sales RLS policies fixed with more permissive rules!' as status; 