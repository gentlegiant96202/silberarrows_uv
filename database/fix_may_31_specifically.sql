-- Check and fix May 31, 2025 specifically

-- 1. Show BEFORE values
SELECT 
    'BEFORE RECALCULATION' as status,
    metric_date,
    working_days_elapsed,
    current_net_sales,
    estimated_net_sales,
    current_net_labor_sales,
    estimated_labor_sales
FROM daily_service_metrics
WHERE metric_date = '2025-05-31';

-- 2. Check targets
SELECT 
    'MAY 2025 TARGETS' as status,
    year,
    month,
    net_sales_target,
    labour_sales_target,
    number_of_working_days
FROM service_monthly_targets
WHERE year = 2025 AND month = 5;

-- 3. Force recalculation for May 31, 2025
SELECT calculate_and_update_metrics('2025-05-31'::DATE) as recalculation_result;

-- 4. Show AFTER values
SELECT 
    'AFTER RECALCULATION' as status,
    metric_date,
    working_days_elapsed,
    current_net_sales,
    estimated_net_sales,
    (estimated_net_sales / current_net_sales * 100) as estimated_vs_current_pct,
    current_net_labor_sales,
    estimated_labor_sales
FROM daily_service_metrics
WHERE metric_date = '2025-05-31';

-- 5. Force recalculation for ALL May 2025 dates (just to be sure)
SELECT 
    metric_date,
    calculate_and_update_metrics(metric_date) as recalculated
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2025
  AND EXTRACT(MONTH FROM metric_date) = 5
ORDER BY metric_date;

SELECT 'All May 2025 metrics recalculated!' as final_status;

