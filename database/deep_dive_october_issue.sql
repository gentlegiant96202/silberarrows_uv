-- =====================================================
-- DEEP DIVE: October 9th Issue
-- =====================================================

-- 1. Check ALL October 2024 data
SELECT 
    '1. ALL OCTOBER DATA' as step,
    metric_date,
    working_days_elapsed,
    current_net_sales,
    estimated_net_sales,
    current_daily_average,
    CASE 
        WHEN estimated_net_sales = 1012426 THEN '✅ CORRECT (1,012,426)'
        WHEN estimated_net_sales = 824940 THEN '❌ WRONG VALUE (824,940)'
        ELSE '❓ UNKNOWN (' || estimated_net_sales || ')'
    END as status
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2024 
  AND EXTRACT(MONTH FROM metric_date) = 10
ORDER BY metric_date;

-- 2. Check October target
SELECT 
    '2. OCTOBER TARGET' as step,
    year,
    month,
    net_sales_target,
    labour_sales_target,
    number_of_working_days,
    net_sales_112_percent
FROM service_monthly_targets
WHERE year = 2024 AND month = 10;

-- 3. Manual recalculation for Oct 9
SELECT 
    '3. MANUAL CALC FOR OCT 9' as step,
    dm.metric_date,
    dm.working_days_elapsed,
    dm.current_net_sales,
    t.number_of_working_days,
    
    -- What daily average should be
    ROUND((dm.current_net_sales / dm.working_days_elapsed)::numeric, 2) as daily_avg_calculated,
    dm.current_daily_average as daily_avg_stored,
    
    -- What estimated should be
    ROUND(((dm.current_net_sales / dm.working_days_elapsed) * t.number_of_working_days)::numeric, 2) as estimated_calculated,
    dm.estimated_net_sales as estimated_stored,
    
    -- Are they matching?
    CASE 
        WHEN ABS(dm.estimated_net_sales - ((dm.current_net_sales / dm.working_days_elapsed) * t.number_of_working_days)) < 1 
        THEN '✅ MATCH'
        ELSE '❌ MISMATCH'
    END as calculation_status
FROM daily_service_metrics dm
JOIN service_monthly_targets t ON 
    EXTRACT(YEAR FROM dm.metric_date) = t.year AND 
    EXTRACT(MONTH FROM dm.metric_date) = t.month
WHERE dm.metric_date = '2024-10-09';

-- 4. Check if trigger exists and is enabled
SELECT 
    '4. TRIGGER STATUS' as step,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement,
    action_orientation,
    CASE 
        WHEN tgenabled = 'O' THEN '✅ ENABLED'
        WHEN tgenabled = 'D' THEN '❌ DISABLED'
        ELSE 'UNKNOWN'
    END as status
FROM information_schema.triggers t
LEFT JOIN pg_trigger pt ON pt.tgname = t.trigger_name
WHERE event_object_table = 'daily_service_metrics'
  AND trigger_name LIKE '%calculate%';

-- 5. Test the calculation function directly
SELECT 
    '5. DIRECT FUNCTION TEST' as step,
    metric_date,
    working_days_elapsed,
    current_net_sales,
    -- Simulate what the function should calculate
    CASE 
        WHEN working_days_elapsed > 0 THEN
            ROUND(((current_net_sales / working_days_elapsed) * 
            (SELECT number_of_working_days FROM service_monthly_targets WHERE year = 2024 AND month = 10))::numeric, 2)
        ELSE 0
    END as should_be_estimated,
    estimated_net_sales as currently_stored,
    ABS(estimated_net_sales - CASE 
        WHEN working_days_elapsed > 0 THEN
            ROUND(((current_net_sales / working_days_elapsed) * 
            (SELECT number_of_working_days FROM service_monthly_targets WHERE year = 2024 AND month = 10))::numeric, 2)
        ELSE 0
    END) as difference
FROM daily_service_metrics
WHERE metric_date = '2024-10-09';

-- 6. Force recalculate Oct 9 (UPDATE to trigger the function)
-- Uncomment to run:
-- UPDATE daily_service_metrics 
-- SET updated_at = NOW() 
-- WHERE metric_date = '2024-10-09';

SELECT '
NEXT STEPS:
- If STEP 3 shows MISMATCH, the data in database is wrong
- If STEP 4 shows trigger DISABLED or missing, trigger needs to be created
- If STEP 5 shows big difference, uncomment STEP 6 to force recalculation
- After fixing, refresh your dashboard
' as instructions;


