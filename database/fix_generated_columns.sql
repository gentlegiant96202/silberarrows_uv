-- Fix generated columns by recreating them as normal columns

-- 1. Remove the trigger first to avoid conflicts
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;

-- 2. Drop the generated columns that can't be updated
ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS gross_profit_year_achieved_percentage;

ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS gross_profit_month_achieved_percentage;

ALTER TABLE sales_daily_metrics 
DROP COLUMN IF EXISTS average_gross_profit_per_car_month;

-- 3. Add them back as normal decimal columns (not generated)
ALTER TABLE sales_daily_metrics 
ADD COLUMN gross_profit_year_achieved_percentage DECIMAL(5,2);

ALTER TABLE sales_daily_metrics 
ADD COLUMN gross_profit_month_achieved_percentage DECIMAL(5,2);

ALTER TABLE sales_daily_metrics 
ADD COLUMN average_gross_profit_per_car_month DECIMAL(12,2);

-- 4. Now update with the correct values
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = 46.20,
    gross_profit_month_achieved_percentage = 4.76,
    marketing_rate_against_gross_profit = 285.65,
    average_gross_profit_per_car_month = 19701.00
WHERE metric_date = '2025-08-06';

-- 5. Verify the update worked
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06';

-- 6. Recreate the trigger to handle future calculations
CREATE OR REPLACE FUNCTION calculate_sales_metrics_final()
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
    
    -- Set target fields and calculate percentages
    IF FOUND THEN
        NEW.gross_profit_year_target := target_rec.gross_profit_year_target;
        NEW.gross_profit_month_target := target_rec.gross_profit_month_target;
        NEW.total_working_days := target_rec.number_of_working_days;
        
        -- Calculate percentages
        NEW.gross_profit_year_achieved_percentage := 
            CASE WHEN target_rec.gross_profit_year_target > 0 
                 THEN (NEW.gross_profit_year_actual / target_rec.gross_profit_year_target * 100)
                 ELSE 0 
            END;
            
        NEW.gross_profit_month_achieved_percentage := 
            CASE WHEN target_rec.gross_profit_month_target > 0 
                 THEN (NEW.gross_profit_month_actual / target_rec.gross_profit_month_target * 100)
                 ELSE 0 
            END;
    END IF;
    
    -- Calculate average profit per car
    NEW.average_gross_profit_per_car_month := 
        CASE WHEN total_units > 0 
             THEN (NEW.gross_profit_month_actual / total_units)
             ELSE 0 
        END;
    
    -- Calculate marketing rate
    NEW.marketing_rate_against_gross_profit := 
        CASE WHEN NEW.gross_profit_month_actual > 0 
             THEN (NEW.marketing_spend_month / NEW.gross_profit_month_actual * 100)
             ELSE 0 
        END;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END $$;

-- 7. Create the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_final();

-- 8. Final verification
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06'; 