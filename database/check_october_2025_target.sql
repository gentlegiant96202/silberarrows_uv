    -- Check October 2025 target settings
SELECT 
    'October 2025 Target' as info,
    year,
    month,
    net_sales_target,
    labour_sales_target,
    number_of_working_days,
    net_sales_112_percent,
    daily_cumulative_target,
    CASE 
        WHEN number_of_working_days = 27 THEN '✅ CORRECT (27 days)'
        WHEN number_of_working_days = 22 THEN '❌ WRONG - Set to 22 instead of 27'
        ELSE '❓ UNEXPECTED (' || number_of_working_days || ' days)'
    END as status
FROM service_monthly_targets
WHERE year = 2025 AND month = 10;

-- If it doesn't exist, you'll get no results
-- If it exists with wrong days, you'll see the issue

-- Show what the estimated SHOULD be with 27 days:
SELECT 
    'What it SHOULD be with 27 days' as calculation,
    299978 as current_sales_day_8,
    8 as working_days_elapsed,
    ROUND((299978.0 / 8.0)::numeric, 2) as daily_avg,
    ROUND((299978.0 / 8.0 * 27)::numeric, 2) as estimated_with_27_days,
    824939.5 as currently_showing,
    ROUND((299978.0 / 8.0 * 27)::numeric, 2) - 824939.5 as difference;


