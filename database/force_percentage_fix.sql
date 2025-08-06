-- Force fix for percentage columns that won't update

-- 1. Check column definitions and constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'sales_daily_metrics'
AND column_name IN (
    'gross_profit_year_achieved_percentage',
    'gross_profit_month_achieved_percentage'
);

-- 2. Check if these columns have GENERATED ALWAYS constraints
SELECT 
    column_name,
    generation_expression,
    is_generated
FROM information_schema.columns
WHERE table_name = 'sales_daily_metrics'
AND column_name IN (
    'gross_profit_year_achieved_percentage',
    'gross_profit_month_achieved_percentage'
);

-- 3. Try to update with explicit type casting
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = 46.20::DECIMAL(5,2),
    gross_profit_month_achieved_percentage = 4.76::DECIMAL(5,2)
WHERE metric_date = '2025-08-06';

-- 4. Check if the update worked
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06';

-- 5. If columns are GENERATED ALWAYS, we need to drop and recreate them
-- (Only run this if step 2 shows they are generated columns)
/*
-- Drop generated columns and recreate as normal columns
ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS gross_profit_year_achieved_percentage;

ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS gross_profit_month_achieved_percentage;

-- Add them back as normal decimal columns
ALTER TABLE sales_daily_metrics 
ADD COLUMN gross_profit_year_achieved_percentage DECIMAL(5,2);

ALTER TABLE sales_daily_metrics 
ADD COLUMN gross_profit_month_achieved_percentage DECIMAL(5,2);

-- Now update with the values
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = 46.20,
    gross_profit_month_achieved_percentage = 4.76
WHERE metric_date = '2025-08-06';
*/

-- 6. Final check
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06'; 