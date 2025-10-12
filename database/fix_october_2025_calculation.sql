-- =====================================================
-- Fix October 2025 Calculation Issue
-- =====================================================

-- STEP 1: Verify the target is correct
SELECT 
    'STEP 1: Verify Target' as step,
    year,
    month,
    number_of_working_days,
    net_sales_target,
    CASE 
        WHEN number_of_working_days = 27 THEN '✅ Correct (27 days)'
        ELSE '❌ Wrong (' || number_of_working_days || ' days)'
    END as status
FROM service_monthly_targets
WHERE year = 2025 AND month = 10;

-- STEP 2: Check current stored values vs what they SHOULD be
SELECT 
    'STEP 2: Current vs Should Be' as step,
    metric_date,
    working_days_elapsed,
    current_net_sales,
    
    -- What's currently stored (WRONG)
    estimated_net_sales as stored_estimated,
    current_daily_average as stored_daily_avg,
    
    -- What it SHOULD be (CORRECT)
    ROUND((current_net_sales / NULLIF(working_days_elapsed, 0))::numeric, 2) as should_be_daily_avg,
    ROUND((current_net_sales / NULLIF(working_days_elapsed, 0) * 27)::numeric, 2) as should_be_estimated,
    
    -- Difference
    ROUND((current_net_sales / NULLIF(working_days_elapsed, 0) * 27)::numeric, 2) - estimated_net_sales as difference
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2025 
  AND EXTRACT(MONTH FROM metric_date) = 10
ORDER BY metric_date;

-- STEP 3: Check if trigger exists
SELECT 
    'STEP 3: Trigger Check' as step,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'daily_service_metrics'
  AND trigger_name LIKE '%calculate%';

-- STEP 4: Force recalculation by updating all October 2025 records
-- This will trigger the calculation function to re-run
UPDATE daily_service_metrics 
SET updated_at = NOW() 
WHERE EXTRACT(YEAR FROM metric_date) = 2025 
  AND EXTRACT(MONTH FROM metric_date) = 10;

-- STEP 5: Verify the fix worked
SELECT 
    'STEP 5: After Fix' as step,
    metric_date,
    working_days_elapsed,
    current_net_sales,
    current_daily_average,
    estimated_net_sales,
    CASE 
        WHEN metric_date = '2025-10-09' AND estimated_net_sales BETWEEN 1012000 AND 1013000 
        THEN '✅ FIXED! (Should be ~1,012,426)'
        ELSE '❌ Still wrong'
    END as status
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2025 
  AND EXTRACT(MONTH FROM metric_date) = 10
ORDER BY metric_date;

SELECT '
✅ DONE! 
If STEP 5 shows "FIXED", refresh your dashboard.
If it still shows "wrong", the trigger might be missing or disabled.
' as result;


