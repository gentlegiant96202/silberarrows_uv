-- Fix the trigger to use base fields instead of generated ones
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;
DROP FUNCTION IF EXISTS calculate_sales_metrics_complete();

CREATE OR REPLACE FUNCTION calculate_sales_metrics_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
    total_units INTEGER;
    calculated_gross_profit_year DECIMAL(12,2);
    calculated_gross_profit_month DECIMAL(12,2);
BEGIN
    -- Calculate values from base fields (not generated columns)
    calculated_gross_profit_year := NEW.gross_sales_year_actual - NEW.cost_of_sales_year_actual;
    calculated_gross_profit_month := NEW.gross_sales_month_actual - NEW.cost_of_sales_month_actual;
    total_units := COALESCE(NEW.units_sold_stock_month, 0) + COALESCE(NEW.units_sold_consignment_month, 0);
    
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
        
        -- Calculate year achievement percentage using calculated value
        IF target_rec.gross_profit_year_target > 0 THEN
            NEW.gross_profit_year_achieved_percentage := ROUND((calculated_gross_profit_year / target_rec.gross_profit_year_target * 100), 2);
        ELSE
            NEW.gross_profit_year_achieved_percentage := 0;
        END IF;
        
        -- Calculate month achievement percentage using calculated value  
        IF target_rec.gross_profit_month_target > 0 THEN
            NEW.gross_profit_month_achieved_percentage := ROUND((calculated_gross_profit_month / target_rec.gross_profit_month_target * 100), 2);
        ELSE
            NEW.gross_profit_month_achieved_percentage := 0;
        END IF;
    ELSE
        NEW.gross_profit_year_achieved_percentage := 0;
        NEW.gross_profit_month_achieved_percentage := 0;
    END IF;
    
    -- Calculate average profit per car using calculated value
    IF total_units > 0 THEN
        NEW.average_gross_profit_per_car_month := ROUND((calculated_gross_profit_month / total_units), 2);
    ELSE
        NEW.average_gross_profit_per_car_month := 0;
    END IF;
    
    -- Calculate marketing rate using calculated value
    IF calculated_gross_profit_month > 0 THEN
        NEW.marketing_rate_against_gross_profit := ROUND((NEW.marketing_spend_month / calculated_gross_profit_month * 100), 2);
    ELSE
        NEW.marketing_rate_against_gross_profit := 0;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END $$;

-- Recreate trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_complete();

-- Force update all existing records
UPDATE sales_daily_metrics SET updated_at = NOW() WHERE metric_date >= '2025-08-01';
