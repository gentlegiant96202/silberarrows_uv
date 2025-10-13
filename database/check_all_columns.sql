-- Check ALL columns in daily_service_metrics table
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'daily_service_metrics'
ORDER BY ordinal_position;

