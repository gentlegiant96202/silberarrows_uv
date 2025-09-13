-- Debug calculation issue - manual test

-- 1. Test the division directly
SELECT 
    2170435.00 as year_actual,
    4698000.00 as year_target,
    (2170435.00 / 4698000.00) as division_result,
    (2170435.00 / 4698000.00) * 100 as percentage_result,
    ROUND((2170435.00 / 4698000.00) * 100, 2) as rounded_percentage;

-- 2. Test with explicit casting
SELECT 
    2170435.00::DECIMAL as year_actual,
    4698000.00::DECIMAL as year_target,
    (2170435.00::DECIMAL / 4698000.00::DECIMAL) as division_result,
    (2170435.00::DECIMAL / 4698000.00::DECIMAL) * 100::DECIMAL as percentage_result,
    ROUND((2170435.00::DECIMAL / 4698000.00::DECIMAL) * 100::DECIMAL, 2) as rounded_percentage;

-- 3. Check the actual values from your data
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    gross_profit_month_actual,
    gross_profit_month_target,
    marketing_spend_month,
    -- Manual calculations
    CASE 
        WHEN gross_profit_year_target > 0 
        THEN ROUND((gross_profit_year_actual / gross_profit_year_target) * 100, 2)
        ELSE 0 
    END as manual_year_percentage,
    CASE 
        WHEN gross_profit_month_target > 0 
        THEN ROUND((gross_profit_month_actual / gross_profit_month_target) * 100, 2)
        ELSE 0 
    END as manual_month_percentage,
    CASE 
        WHEN gross_profit_month_actual > 0 
        THEN ROUND((marketing_spend_month / gross_profit_month_actual) * 100, 2)
        ELSE 0 
    END as manual_marketing_percentage
FROM sales_daily_metrics
ORDER BY metric_date DESC
LIMIT 1;

-- 4. Check if there's a data type issue
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'sales_daily_metrics'
AND column_name IN (
    'gross_profit_year_actual',
    'gross_profit_year_target',
    'gross_profit_year_achieved_percentage',
    'gross_profit_month_actual',
    'gross_profit_month_target',
    'gross_profit_month_achieved_percentage',
    'marketing_spend_month',
    'marketing_rate_against_gross_profit'
);

-- 5. Simple update test - bypass trigger
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = ROUND((gross_profit_year_actual / NULLIF(gross_profit_year_target, 0)) * 100, 2),
    gross_profit_month_achieved_percentage = ROUND((gross_profit_month_actual / NULLIF(gross_profit_month_target, 0)) * 100, 2),
    marketing_rate_against_gross_profit = ROUND((marketing_spend_month / NULLIF(gross_profit_month_actual, 0)) * 100, 2)
WHERE metric_date = '2025-08-06';

-- 6. Check the results after manual update
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_actual,
    gross_profit_month_target,
    gross_profit_month_achieved_percentage,
    marketing_spend_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06'; 