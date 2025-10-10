-- Check May 2025 data and force recalculation

-- 1. Check what data exists for May 2025
SELECT 
    metric_date,
    working_days_elapsed,
    current_net_sales,
    estimated_net_sales,
    current_net_labor_sales,
    estimated_labor_sales
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2025
  AND EXTRACT(MONTH FROM metric_date) = 5
ORDER BY metric_date DESC
LIMIT 5;

-- 2. Check May 2025 targets
SELECT * FROM service_monthly_targets
WHERE year = 2025 AND month = 5;

-- 3. Force recalculation for all May 2025 records
DO $$
DECLARE
    metric_record RECORD;
    recalc_count INTEGER := 0;
BEGIN
    FOR metric_record IN 
        SELECT metric_date 
        FROM daily_service_metrics 
        WHERE EXTRACT(YEAR FROM metric_date) = 2025
          AND EXTRACT(MONTH FROM metric_date) = 5
        ORDER BY metric_date
    LOOP
        PERFORM calculate_and_update_metrics(metric_record.metric_date);
        recalc_count := recalc_count + 1;
        RAISE NOTICE 'Recalculated: %', metric_record.metric_date;
    END LOOP;
    
    RAISE NOTICE 'Total records recalculated: %', recalc_count;
END $$;

-- 4. Check the results after recalculation
SELECT 
    metric_date,
    working_days_elapsed,
    current_net_sales,
    estimated_net_sales,
    current_net_sales_percentage,
    estimated_net_sales_percentage,
    current_net_labor_sales,
    estimated_labor_sales
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2025
  AND EXTRACT(MONTH FROM metric_date) = 5
ORDER BY metric_date DESC
LIMIT 5;

