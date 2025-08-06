-- Simple check to see why calculations are 0

-- Show exactly what's in your data
SELECT 
    metric_date,
    'INPUT VALUES:' as section,
    gross_profit_year_actual,
    gross_profit_month_actual,
    marketing_spend_month,
    units_sold_stock_month,
    units_sold_consignment_month,
    total_units_sold_month
FROM sales_daily_metrics 
WHERE metric_date IN ('2025-08-06', '2025-08-07')
ORDER BY metric_date DESC;

-- Show targets
SELECT 
    'TARGETS:' as section,
    year,
    month,
    gross_profit_year_target,
    gross_profit_month_target
FROM sales_monthly_targets 
WHERE year = 2025 AND month = 8;

-- If no data shows up, let's see what dates actually exist
SELECT 
    'ALL DATES:' as section,
    metric_date,
    gross_profit_year_actual,
    gross_profit_month_actual
FROM sales_daily_metrics 
ORDER BY metric_date DESC 
LIMIT 5; 