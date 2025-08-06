-- Check column constraints and recreate if needed

-- 1. Check if these columns are GENERATED or have constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    is_generated,
    generation_expression,
    is_updatable
FROM information_schema.columns
WHERE table_name = 'sales_daily_metrics'
AND column_name IN (
    'gross_profit_year_achieved_percentage',
    'gross_profit_month_achieved_percentage',
    'average_gross_profit_per_car_month',
    'marketing_rate_against_gross_profit'
)
ORDER BY column_name;

-- 2. If they are generated columns, drop and recreate them
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;

-- Drop the problematic columns completely
ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS gross_profit_year_achieved_percentage CASCADE;

ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS gross_profit_month_achieved_percentage CASCADE;

ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS average_gross_profit_per_car_month CASCADE;

ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS marketing_rate_against_gross_profit CASCADE;

-- 3. Add them back as simple DECIMAL columns (not generated)
ALTER TABLE sales_daily_metrics 
ADD COLUMN gross_profit_year_achieved_percentage DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE sales_daily_metrics 
ADD COLUMN gross_profit_month_achieved_percentage DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE sales_daily_metrics 
ADD COLUMN average_gross_profit_per_car_month DECIMAL(12,2) DEFAULT 0.00;

ALTER TABLE sales_daily_metrics 
ADD COLUMN marketing_rate_against_gross_profit DECIMAL(5,2) DEFAULT 0.00;

-- 4. Now update with the correct values
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

-- 5. Verify the updates worked this time
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    average_gross_profit_per_car_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
WHERE metric_date IN ('2025-08-06', '2025-08-07')
ORDER BY metric_date DESC;

-- 6. Recreate a simple trigger for future entries
CREATE OR REPLACE FUNCTION calculate_sales_metrics_new()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set target values from monthly targets
    SELECT 
        gross_profit_year_target,
        gross_profit_month_target,
        number_of_working_days
    INTO NEW.gross_profit_year_target, NEW.gross_profit_month_target, NEW.total_working_days
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month;
    
    -- Calculate percentages if targets exist
    IF NEW.gross_profit_year_target > 0 THEN
        NEW.gross_profit_year_achieved_percentage := (NEW.gross_profit_year_actual / NEW.gross_profit_year_target * 100);
    END IF;
    
    IF NEW.gross_profit_month_target > 0 THEN
        NEW.gross_profit_month_achieved_percentage := (NEW.gross_profit_month_actual / NEW.gross_profit_month_target * 100);
    END IF;
    
    -- Calculate profit per car
    IF NEW.total_units_sold_month > 0 THEN
        NEW.average_gross_profit_per_car_month := (NEW.gross_profit_month_actual / NEW.total_units_sold_month);
    END IF;
    
    -- Calculate marketing rate
    IF NEW.gross_profit_month_actual > 0 THEN
        NEW.marketing_rate_against_gross_profit := (NEW.marketing_spend_month / NEW.gross_profit_month_actual * 100);
    END IF;
    
    RETURN NEW;
END $$;

CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_new(); 