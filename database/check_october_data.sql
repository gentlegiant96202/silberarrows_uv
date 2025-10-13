-- Check all October 2025 data
SELECT 
    metric_date,
    working_days_elapsed,
    current_net_sales,
    current_daily_average,
    estimated_net_sales,
    estimated_net_sales_percentage,
    current_net_labor_sales,
    estimated_labor_sales,
    estimated_labor_sales_percentage
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2025
  AND EXTRACT(MONTH FROM metric_date) = 10
ORDER BY metric_date;

