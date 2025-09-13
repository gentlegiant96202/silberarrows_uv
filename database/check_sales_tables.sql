-- Check if sales tables exist and their structure

-- 1. Check if sales_daily_metrics table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%sales%'
ORDER BY table_name;

-- 2. If sales_daily_metrics exists, check its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'sales_daily_metrics' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check if sales_monthly_targets exists and has data
SELECT COUNT(*) as target_count FROM sales_monthly_targets;
SELECT * FROM sales_monthly_targets LIMIT 3;

-- 4. Check if sales_daily_metrics table exists and has data
SELECT COUNT(*) as metrics_count FROM sales_daily_metrics;
SELECT * FROM sales_daily_metrics LIMIT 3; 