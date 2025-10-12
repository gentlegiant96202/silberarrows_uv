-- Check what labor/labour columns exist in the database
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'daily_service_metrics'
  AND (column_name LIKE '%labor%' OR column_name LIKE '%labour%')
ORDER BY column_name;

-- Also check what value is stored for October 9, 2025
-- Using only columns that exist
SELECT 
    metric_date,
    current_net_labor_sales,
    estimated_labor_sales,
    estimated_labor_percentage,
    current_labour_sales_percentage
FROM daily_service_metrics
WHERE metric_date = '2025-10-09';

