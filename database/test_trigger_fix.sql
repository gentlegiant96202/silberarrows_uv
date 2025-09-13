-- Test and Fix Sales Trigger
-- This will test if the trigger works by updating existing data

-- First, ensure we have a target for August 2025 (based on your screenshot showing 2025-08-06)
INSERT INTO sales_monthly_targets (year, month, gross_profit_year_target, gross_profit_month_target, number_of_working_days)
VALUES (2025, 8, 12000000.00, 1000000.00, 22)
ON CONFLICT (year, month) DO UPDATE SET
    gross_profit_year_target = EXCLUDED.gross_profit_year_target,
    gross_profit_month_target = EXCLUDED.gross_profit_month_target,
    number_of_working_days = EXCLUDED.number_of_working_days;

-- Also add targets for current month if different
INSERT INTO sales_monthly_targets (year, month, gross_profit_year_target, gross_profit_month_target, number_of_working_days)
SELECT 
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    12000000.00,
    1000000.00,
    22
WHERE NOT EXISTS (
    SELECT 1 FROM sales_monthly_targets 
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) 
    AND month = EXTRACT(MONTH FROM CURRENT_DATE)
);

-- Now test the trigger by updating existing sales data
-- This will force the trigger to recalculate percentages
UPDATE sales_daily_metrics 
SET updated_at = NOW()
WHERE metric_date IS NOT NULL;

-- Check the results
SELECT 
    metric_date,
    year,
    month,
    gross_profit_year_actual,
    gross_profit_year_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_actual,
    gross_profit_month_target,
    gross_profit_month_achieved_percentage,
    marketing_spend_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics
ORDER BY metric_date DESC;

-- Show success message
SELECT 'Trigger test completed - check percentages above!' as status; 