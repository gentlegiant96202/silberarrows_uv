-- Verify October 2025 target
SELECT 
    year,
    month,
    net_sales_target,
    labour_sales_target,
    number_of_working_days,
    net_sales_112_percent
FROM service_monthly_targets
WHERE year = 2025 AND month = 10;

