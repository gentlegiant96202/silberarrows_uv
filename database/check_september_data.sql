-- Check what months in 2025 actually have data
SELECT 
  EXTRACT(MONTH FROM metric_date) as month,
  COUNT(*) as days_with_data,
  MAX(current_net_sales) as final_net_sales,
  MAX(metric_date) as latest_date
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2025
GROUP BY EXTRACT(MONTH FROM metric_date)
ORDER BY month DESC;

-- Show recent data entries
SELECT 
  metric_date,
  working_days_elapsed,
  current_net_sales,
  current_net_sales_percentage
FROM daily_service_metrics
ORDER BY metric_date DESC
LIMIT 20;

