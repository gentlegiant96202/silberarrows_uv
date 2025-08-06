-- Fixed trigger check and recreation

-- 1. Check if trigger exists (corrected query)
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'sales_metrics_calculation_trigger'
AND event_object_table = 'sales_daily_metrics';

-- 2. Check recent entries to see if calculations are missing
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_month_actual,
    total_units_sold_month,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    average_gross_profit_per_car_month,
    marketing_rate_against_gross_profit,
    created_at
FROM sales_daily_metrics 
ORDER BY created_at DESC 
LIMIT 3;

-- 3. Drop and recreate the trigger to ensure it works
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;
DROP FUNCTION IF EXISTS calculate_sales_metrics_final();
DROP FUNCTION IF EXISTS calculate_sales_metrics_auto();

-- 4. Create a robust trigger function
CREATE OR REPLACE FUNCTION calculate_sales_metrics_auto()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
    total_units INTEGER;
    year_target DECIMAL(12,2);
    month_target DECIMAL(12,2);
BEGIN
    -- Calculate total units first
    total_units := COALESCE(NEW.units_sold_stock_month, 0) + COALESCE(NEW.units_sold_consignment_month, 0);
    NEW.total_units_sold_month := total_units;
    
    -- Get target data for this year/month
    SELECT 
        gross_profit_year_target,
        gross_profit_month_target,
        number_of_working_days
    INTO target_rec
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month
    LIMIT 1;
    
    IF FOUND THEN
        -- Store target values
        NEW.gross_profit_year_target := target_rec.gross_profit_year_target;
        NEW.gross_profit_month_target := target_rec.gross_profit_month_target;
        NEW.total_working_days := target_rec.number_of_working_days;
        
        year_target := target_rec.gross_profit_year_target;
        month_target := target_rec.gross_profit_month_target;
        
        -- Calculate year achievement percentage
        IF year_target > 0 AND NEW.gross_profit_year_actual IS NOT NULL THEN
            NEW.gross_profit_year_achieved_percentage := ROUND((NEW.gross_profit_year_actual / year_target * 100), 2);
        ELSE
            NEW.gross_profit_year_achieved_percentage := 0.00;
        END IF;
        
        -- Calculate month achievement percentage
        IF month_target > 0 AND NEW.gross_profit_month_actual IS NOT NULL THEN
            NEW.gross_profit_month_achieved_percentage := ROUND((NEW.gross_profit_month_actual / month_target * 100), 2);
        ELSE
            NEW.gross_profit_month_achieved_percentage := 0.00;
        END IF;
    ELSE
        -- No targets found
        NEW.gross_profit_year_achieved_percentage := 0.00;
        NEW.gross_profit_month_achieved_percentage := 0.00;
    END IF;
    
    -- Calculate average profit per car
    IF total_units > 0 AND NEW.gross_profit_month_actual IS NOT NULL THEN
        NEW.average_gross_profit_per_car_month := ROUND((NEW.gross_profit_month_actual / total_units), 2);
    ELSE
        NEW.average_gross_profit_per_car_month := 0.00;
    END IF;
    
    -- Calculate marketing rate
    IF NEW.gross_profit_month_actual > 0 AND NEW.marketing_spend_month IS NOT NULL THEN
        NEW.marketing_rate_against_gross_profit := ROUND((NEW.marketing_spend_month / NEW.gross_profit_month_actual * 100), 2);
    ELSE
        NEW.marketing_rate_against_gross_profit := 0.00;
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END $$;

-- 5. Create the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_auto();

-- 6. Test the trigger by updating existing data
UPDATE sales_daily_metrics 
SET updated_at = NOW()
WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days';

-- 7. Verify trigger is working
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    average_gross_profit_per_car_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
ORDER BY metric_date DESC 
LIMIT 5; 