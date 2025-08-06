-- Restore all calculations - percentages and profit per car

-- 1. Update all calculated fields for the 2025-08-06 entry
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = 46.20,
    gross_profit_month_achieved_percentage = 4.76,
    marketing_rate_against_gross_profit = 285.65,
    average_gross_profit_per_car_month = 19701.00
WHERE metric_date = '2025-08-06';

-- 2. Verify all values are correct
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_actual,
    gross_profit_month_target,
    gross_profit_month_achieved_percentage,
    marketing_spend_month,
    marketing_rate_against_gross_profit,
    units_sold_stock_month,
    units_sold_consignment_month,
    total_units_sold_month,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06';

-- 3. Fix the trigger to preserve all calculations
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;

CREATE OR REPLACE FUNCTION calculate_sales_metrics_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
    total_units INTEGER;
BEGIN
    -- Calculate total units
    total_units := COALESCE(NEW.units_sold_stock_month, 0) + COALESCE(NEW.units_sold_consignment_month, 0);
    NEW.total_units_sold_month := total_units;
    
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
        
        -- Calculate year achievement percentage
        IF target_rec.gross_profit_year_target > 0 THEN
            NEW.gross_profit_year_achieved_percentage := (NEW.gross_profit_year_actual / target_rec.gross_profit_year_target * 100);
        ELSE
            NEW.gross_profit_year_achieved_percentage := 0;
        END IF;
        
        -- Calculate month achievement percentage
        IF target_rec.gross_profit_month_target > 0 THEN
            NEW.gross_profit_month_achieved_percentage := (NEW.gross_profit_month_actual / target_rec.gross_profit_month_target * 100);
        ELSE
            NEW.gross_profit_month_achieved_percentage := 0;
        END IF;
    ELSE
        NEW.gross_profit_year_achieved_percentage := 0;
        NEW.gross_profit_month_achieved_percentage := 0;
    END IF;
    
    -- Calculate average profit per car
    IF total_units > 0 THEN
        NEW.average_gross_profit_per_car_month := (NEW.gross_profit_month_actual / total_units);
    ELSE
        NEW.average_gross_profit_per_car_month := 0;
    END IF;
    
    -- Calculate marketing rate
    IF NEW.gross_profit_month_actual > 0 THEN
        NEW.marketing_rate_against_gross_profit := (NEW.marketing_spend_month / NEW.gross_profit_month_actual * 100);
    ELSE
        NEW.marketing_rate_against_gross_profit := 0;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END $$;

-- 4. Create the complete trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_complete();

-- 5. Final verification - all values should be correct
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06'; 