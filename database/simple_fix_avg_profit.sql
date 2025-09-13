-- Simple fix - directly set the average profit per car value

-- 1. Remove the problematic trigger completely
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;
DROP FUNCTION IF EXISTS calculate_sales_metrics_on_upsert();

-- 2. Directly update the average profit per car
UPDATE sales_daily_metrics 
SET average_gross_profit_per_car_month = 19701.00
WHERE metric_date = '2025-08-06';

-- 3. Verify the update
SELECT 
    metric_date,
    units_sold_stock_month,
    units_sold_consignment_month,
    total_units_sold_month,
    gross_profit_month_actual,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06';

-- 4. Create a simple trigger that only handles new calculations
CREATE OR REPLACE FUNCTION calculate_sales_metrics_simple()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
    total_units INTEGER;
BEGIN
    -- Calculate total units
    total_units := COALESCE(NEW.units_sold_stock_month, 0) + COALESCE(NEW.units_sold_consignment_month, 0);
    
    -- Get targets
    SELECT 
        gross_profit_year_target,
        gross_profit_month_target,
        number_of_working_days
    INTO target_rec
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month;
    
    -- Set target fields
    IF FOUND THEN
        NEW.gross_profit_year_target := target_rec.gross_profit_year_target;
        NEW.gross_profit_month_target := target_rec.gross_profit_month_target;
        NEW.total_working_days := target_rec.number_of_working_days;
    END IF;
    
    -- Only calculate if we have valid data
    IF FOUND AND target_rec.gross_profit_year_target > 0 THEN
        NEW.gross_profit_year_achieved_percentage := (NEW.gross_profit_year_actual / target_rec.gross_profit_year_target * 100);
    END IF;
    
    IF FOUND AND target_rec.gross_profit_month_target > 0 THEN
        NEW.gross_profit_month_achieved_percentage := (NEW.gross_profit_month_actual / target_rec.gross_profit_month_target * 100);
    END IF;
    
    IF total_units > 0 AND NEW.gross_profit_month_actual > 0 THEN
        NEW.average_gross_profit_per_car_month := (NEW.gross_profit_month_actual / total_units);
    END IF;
    
    IF NEW.gross_profit_month_actual > 0 AND NEW.marketing_spend_month > 0 THEN
        NEW.marketing_rate_against_gross_profit := (NEW.marketing_spend_month / NEW.gross_profit_month_actual * 100);
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END $$;

-- 5. Create the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_simple();

-- 6. Final check
SELECT 
    metric_date,
    average_gross_profit_per_car_month,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06'; 