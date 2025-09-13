-- Fix NULL percentage calculation issue

-- Drop and recreate the trigger function with better NULL handling
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;
DROP FUNCTION IF EXISTS calculate_sales_metrics_on_upsert();

CREATE OR REPLACE FUNCTION calculate_sales_metrics_on_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
    year_target DECIMAL(12,2);
    month_target DECIMAL(12,2);
    year_actual DECIMAL(12,2);
    month_actual DECIMAL(12,2);
    marketing_spend DECIMAL(12,2);
    total_units INTEGER;
BEGIN
    -- Ensure we have valid values (convert NULL to 0)
    year_actual := COALESCE(NEW.gross_profit_year_actual, 0);
    month_actual := COALESCE(NEW.gross_profit_month_actual, 0);
    marketing_spend := COALESCE(NEW.marketing_spend_month, 0);
    total_units := COALESCE(NEW.total_units_sold_month, 0);
    
    -- Get target data for this month
    SELECT 
        gross_profit_year_target,
        gross_profit_month_target,
        number_of_working_days
    INTO target_rec
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month;
    
    IF FOUND THEN
        year_target := COALESCE(target_rec.gross_profit_year_target, 0);
        month_target := COALESCE(target_rec.gross_profit_month_target, 0);
        
        -- Update target values
        NEW.gross_profit_year_target := year_target;
        NEW.gross_profit_month_target := month_target;
        NEW.total_working_days := target_rec.number_of_working_days;
        
        -- Calculate achievement percentages with explicit casting
        IF year_target > 0 THEN
            NEW.gross_profit_year_achieved_percentage := ROUND((year_actual::DECIMAL / year_target::DECIMAL) * 100::DECIMAL, 2);
        ELSE
            NEW.gross_profit_year_achieved_percentage := 0.00;
        END IF;
            
        IF month_target > 0 THEN
            NEW.gross_profit_month_achieved_percentage := ROUND((month_actual::DECIMAL / month_target::DECIMAL) * 100::DECIMAL, 2);
        ELSE
            NEW.gross_profit_month_achieved_percentage := 0.00;
        END IF;
        
        -- Calculate average gross profit per car
        IF total_units > 0 THEN
            NEW.average_gross_profit_per_car_month := ROUND(month_actual::DECIMAL / total_units::DECIMAL, 2);
        ELSE
            NEW.average_gross_profit_per_car_month := 0.00;
        END IF;
        
        -- Calculate marketing rate against gross profit
        IF month_actual > 0 THEN
            NEW.marketing_rate_against_gross_profit := ROUND((marketing_spend::DECIMAL / month_actual::DECIMAL) * 100::DECIMAL, 2);
        ELSE
            NEW.marketing_rate_against_gross_profit := 0.00;
        END IF;
    ELSE
        -- No targets found, set all fields to 0
        NEW.gross_profit_year_target := 0.00;
        NEW.gross_profit_month_target := 0.00;
        NEW.total_working_days := 0;
        NEW.gross_profit_year_achieved_percentage := 0.00;
        NEW.gross_profit_month_achieved_percentage := 0.00;
        NEW.average_gross_profit_per_car_month := 0.00;
        NEW.marketing_rate_against_gross_profit := 0.00;
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END $$;

-- Create the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_on_upsert();

-- Force update of existing records
UPDATE sales_daily_metrics 
SET updated_at = NOW();

-- Check the results
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
ORDER BY metric_date DESC; 