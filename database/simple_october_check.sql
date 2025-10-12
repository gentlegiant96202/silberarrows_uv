-- Simple check for October 9th issue
-- Run this and look at the results

SELECT 
    'October 9th Data' as info,
    dm.metric_date,
    dm.working_days_elapsed as days_elapsed,
    dm.current_net_sales,
    dm.estimated_net_sales as stored_estimated,
    
    -- Get October target info
    t.number_of_working_days as oct_total_days,
    t.net_sales_target as oct_target,
    
    -- Calculate what it SHOULD be
    CASE 
        WHEN dm.working_days_elapsed > 0 THEN
            ROUND((dm.current_net_sales / dm.working_days_elapsed * t.number_of_working_days)::numeric, 2)
        ELSE 0
    END as should_be_estimated,
    
    -- Show the difference
    CASE 
        WHEN dm.working_days_elapsed > 0 THEN
            ROUND((dm.current_net_sales / dm.working_days_elapsed * t.number_of_working_days)::numeric, 2) - dm.estimated_net_sales
        ELSE 0
    END as difference,
    
    -- Is it correct?
    CASE 
        WHEN dm.estimated_net_sales = 1012426 THEN '✅ CORRECT'
        ELSE '❌ WRONG - Should be 1,012,426'
    END as status

FROM daily_service_metrics dm
LEFT JOIN service_monthly_targets t ON 
    EXTRACT(YEAR FROM dm.metric_date) = t.year AND 
    EXTRACT(MONTH FROM dm.metric_date) = t.month
WHERE dm.metric_date = '2024-10-09';


