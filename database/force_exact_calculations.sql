-- Force exact calculations with explicit values

-- 1. Calculate exactly what the values should be
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    -- Year percentage: 2170435 / 4698000 * 100 = 46.20
    (2170435.00 / 4698000.00 * 100) as expected_year_percentage,
    
    gross_profit_month_actual,
    gross_profit_month_target,
    -- Month percentage for 2025-08-06: 19701 / 414000 * 100 = 4.76
    -- Month percentage for 2025-08-07: 40000 / 414000 * 100 = 9.66
    (gross_profit_month_actual / 414000.00 * 100) as expected_month_percentage,
    
    total_units_sold_month,
    -- Profit per car for 2025-08-06: 19701 / 1 = 19701
    -- Profit per car for 2025-08-07: 40000 / 2 = 20000
    (gross_profit_month_actual / total_units_sold_month) as expected_profit_per_car,
    
    marketing_spend_month,
    -- Marketing rate for 2025-08-06: 56275 / 19701 * 100 = 285.65
    -- Marketing rate for 2025-08-07: 56275 / 40000 * 100 = 140.69
    (marketing_spend_month / gross_profit_month_actual * 100) as expected_marketing_rate

FROM sales_daily_metrics 
WHERE metric_date IN ('2025-08-06', '2025-08-07')
ORDER BY metric_date DESC;

-- 2. Update each row individually with explicit values
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = 46.20,
    gross_profit_month_achieved_percentage = 4.76,
    average_gross_profit_per_car_month = 19701.00,
    marketing_rate_against_gross_profit = 285.65
WHERE metric_date = '2025-08-06';

UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = 46.20,
    gross_profit_month_achieved_percentage = 9.66,
    average_gross_profit_per_car_month = 20000.00,
    marketing_rate_against_gross_profit = 140.69
WHERE metric_date = '2025-08-07';

-- 3. Verify the updates worked
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    average_gross_profit_per_car_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
WHERE metric_date IN ('2025-08-06', '2025-08-07')
ORDER BY metric_date DESC; 