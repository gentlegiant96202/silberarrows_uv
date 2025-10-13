-- Debug the estimated net sales percentage calculation
-- Replace 'YOUR_DATE' with the actual date you just added

SELECT 
    m.metric_date,
    m.working_days_elapsed,
    m.current_net_sales,
    m.current_daily_average,
    m.estimated_net_sales,
    t.number_of_working_days,
    t.net_sales_target,
    
    -- Manual calculation to verify
    ROUND((m.current_net_sales / m.working_days_elapsed)::NUMERIC, 2) as calculated_daily_avg,
    ROUND((m.current_net_sales / m.working_days_elapsed * t.number_of_working_days)::NUMERIC, 2) as calculated_estimated_sales,
    ROUND(((m.current_net_sales / m.working_days_elapsed * t.number_of_working_days) / t.net_sales_target * 100)::NUMERIC, 2) as calculated_percentage,
    
    -- What's in the database
    m.estimated_net_sales_percentage as db_percentage,
    
    -- Difference
    ROUND(((m.current_net_sales / m.working_days_elapsed * t.number_of_working_days) / t.net_sales_target * 100)::NUMERIC, 2) - m.estimated_net_sales_percentage as difference
    
FROM daily_service_metrics m
JOIN service_monthly_targets t 
    ON EXTRACT(YEAR FROM m.metric_date) = t.year 
    AND EXTRACT(MONTH FROM m.metric_date) = t.month
ORDER BY m.metric_date DESC
LIMIT 5;

