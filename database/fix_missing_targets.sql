-- Fix missing targets issue

-- 1. Check if targets exist in sales_monthly_targets
SELECT 
    'MONTHLY TARGETS:' as section,
    year,
    month,
    gross_profit_year_target,
    gross_profit_month_target,
    number_of_working_days
FROM sales_monthly_targets 
WHERE year = 2025 AND month = 8;

-- 2. Check what target values are stored in sales_daily_metrics
SELECT 
    'DAILY METRICS TARGETS:' as section,
    metric_date,
    gross_profit_year_target,
    gross_profit_month_target,
    total_working_days
FROM sales_daily_metrics 
WHERE metric_date IN ('2025-08-06', '2025-08-07')
ORDER BY metric_date DESC;

-- 3. If no targets in monthly table, create them (using the values from your previous working entry)
INSERT INTO sales_monthly_targets (year, month, gross_profit_year_target, gross_profit_month_target, number_of_working_days)
VALUES (2025, 8, 4698000.00, 414000.00, 22)
ON CONFLICT (year, month) DO UPDATE SET
    gross_profit_year_target = EXCLUDED.gross_profit_year_target,
    gross_profit_month_target = EXCLUDED.gross_profit_month_target,
    number_of_working_days = EXCLUDED.number_of_working_days;

-- 4. Update the sales_daily_metrics with target values
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_target = 4698000.00,
    gross_profit_month_target = 414000.00,
    total_working_days = 22
WHERE metric_date IN ('2025-08-06', '2025-08-07');

-- 5. Now calculate the percentages manually
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = ROUND((gross_profit_year_actual / 4698000.00 * 100), 2),
    gross_profit_month_achieved_percentage = ROUND((gross_profit_month_actual / 414000.00 * 100), 2),
    average_gross_profit_per_car_month = 
        CASE 
            WHEN total_units_sold_month > 0 
            THEN ROUND((gross_profit_month_actual / total_units_sold_month), 2)
            ELSE 0 
        END,
    marketing_rate_against_gross_profit = 
        CASE 
            WHEN gross_profit_month_actual > 0 
            THEN ROUND((marketing_spend_month / gross_profit_month_actual * 100), 2)
            ELSE 0 
        END
WHERE metric_date IN ('2025-08-06', '2025-08-07');

-- 6. Check the results
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_actual,
    gross_profit_month_target,
    gross_profit_month_achieved_percentage,
    total_units_sold_month,
    average_gross_profit_per_car_month,
    marketing_spend_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
WHERE metric_date IN ('2025-08-06', '2025-08-07')
ORDER BY metric_date DESC; 