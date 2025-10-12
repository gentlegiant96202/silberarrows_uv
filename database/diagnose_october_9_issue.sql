-- =====================================================
-- DIAGNOSTIC: Check October 9th Estimated Sales Issue
-- Expected: AED 1,012,426
-- =====================================================

-- 1. Check if the record exists for October 9th
SELECT 
    'STEP 1: Check if October 9th data exists' as step,
    *
FROM daily_service_metrics
WHERE metric_date = '2024-10-09';

-- 2. Check if October target is set correctly
SELECT 
    'STEP 2: Check October 2024 target settings' as step,
    year,
    month,
    net_sales_target,
    labour_sales_target,
    number_of_working_days as total_working_days,
    daily_cumulative_target,
    net_sales_112_percent
FROM service_monthly_targets
WHERE year = 2024 AND month = 10;

-- 3. Manual calculation check
SELECT 
    'STEP 3: Manual calculation for October 9th' as step,
    dm.metric_date,
    dm.working_days_elapsed,
    dm.current_net_sales,
    dm.current_net_labor_sales,
    t.number_of_working_days as total_working_days,
    t.net_sales_target,
    
    -- Current daily average
    ROUND((dm.current_net_sales / NULLIF(dm.working_days_elapsed, 0))::numeric, 2) as calculated_daily_avg,
    
    -- Estimated net sales (THIS IS THE KEY CALCULATION)
    ROUND(((dm.current_net_sales / NULLIF(dm.working_days_elapsed, 0)) * t.number_of_working_days)::numeric, 2) as calculated_estimated_sales,
    
    -- What's stored in the database
    dm.estimated_net_sales as stored_estimated_sales,
    
    -- Difference
    ROUND((((dm.current_net_sales / NULLIF(dm.working_days_elapsed, 0)) * t.number_of_working_days) - dm.estimated_net_sales)::numeric, 2) as difference
    
FROM daily_service_metrics dm
LEFT JOIN service_monthly_targets t ON 
    EXTRACT(YEAR FROM dm.metric_date) = t.year AND 
    EXTRACT(MONTH FROM dm.metric_date) = t.month
WHERE dm.metric_date = '2024-10-09';

-- 4. Check if the trigger exists
SELECT 
    'STEP 4: Check if calculation trigger exists' as step,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'daily_service_metrics'
  AND trigger_name LIKE '%calculate%';

-- 5. What values would give us AED 1,012,426?
SELECT 
    'STEP 5: What values would give AED 1,012,426 estimated?' as step,
    t.number_of_working_days,
    1012426.00 as target_estimated_sales,
    ROUND((1012426.00 / t.number_of_working_days)::numeric, 2) as required_daily_avg,
    ROUND((1012426.00 / t.number_of_working_days * 9)::numeric, 2) as required_current_sales_on_day_9
FROM service_monthly_targets t
WHERE t.year = 2024 AND t.month = 10;

-- =====================================================
-- SUMMARY
-- =====================================================
SELECT '
DIAGNOSIS SUMMARY:
- Check STEP 1 to see actual data for Oct 9
- Check STEP 2 to verify October target settings
- Check STEP 3 to see if calculation is correct
- Check STEP 4 to verify trigger exists
- Check STEP 5 to see what values you should have
' as instructions;


