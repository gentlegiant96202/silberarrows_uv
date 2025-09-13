-- Fix trigger and recalculate NULL percentages

-- 1. Check current trigger status
SELECT 
    trigger_name, 
    event_manipulation, 
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'sales_metrics_calculation_trigger';

-- 2. Check current data (should show NULLs)
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_month_actual,
    marketing_spend_month,
    gross_profit_year_target,
    gross_profit_month_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
ORDER BY metric_date DESC;

-- 3. Drop and recreate the trigger function (fixed version)
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;
DROP FUNCTION IF EXISTS calculate_sales_metrics_on_upsert();

CREATE OR REPLACE FUNCTION calculate_sales_metrics_on_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
BEGIN
    -- Get target data for this month
    SELECT * INTO target_rec
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month;
    
    IF FOUND THEN
        -- Update target values
        NEW.gross_profit_year_target := target_rec.gross_profit_year_target;
        NEW.gross_profit_month_target := target_rec.gross_profit_month_target;
        NEW.total_working_days := target_rec.number_of_working_days;
        
        -- Calculate achievement percentages
        NEW.gross_profit_year_achieved_percentage := 
            CASE WHEN target_rec.gross_profit_year_target > 0 
                 THEN ROUND((NEW.gross_profit_year_actual / target_rec.gross_profit_year_target) * 100, 2)
                 ELSE 0 
            END;
            
        NEW.gross_profit_month_achieved_percentage := 
            CASE WHEN target_rec.gross_profit_month_target > 0 
                 THEN ROUND((NEW.gross_profit_month_actual / target_rec.gross_profit_month_target) * 100, 2)
                 ELSE 0 
            END;
        
        -- Calculate average gross profit per car
        NEW.average_gross_profit_per_car_month := 
            CASE WHEN NEW.total_units_sold_month > 0 
                 THEN ROUND(NEW.gross_profit_month_actual / NEW.total_units_sold_month, 2)
                 ELSE 0 
            END;
        
        -- Calculate marketing rate against gross profit
        NEW.marketing_rate_against_gross_profit := 
            CASE WHEN NEW.gross_profit_month_actual > 0 
                 THEN ROUND((NEW.marketing_spend_month / NEW.gross_profit_month_actual) * 100, 2)
                 ELSE 0 
            END;
    ELSE
        -- No targets found, set calculated fields to 0
        NEW.gross_profit_year_target := 0;
        NEW.gross_profit_month_target := 0;
        NEW.total_working_days := 0;
        NEW.gross_profit_year_achieved_percentage := 0;
        NEW.gross_profit_month_achieved_percentage := 0;
        NEW.average_gross_profit_per_car_month := 0;
        NEW.marketing_rate_against_gross_profit := 0;
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END $$;

-- 4. Create the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_on_upsert();

-- 5. Manually update existing records to trigger calculations
UPDATE sales_daily_metrics 
SET updated_at = NOW()
WHERE gross_profit_year_achieved_percentage IS NULL 
   OR gross_profit_month_achieved_percentage IS NULL
   OR marketing_rate_against_gross_profit IS NULL;

-- 6. Verify the fix worked
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_month_actual,
    marketing_spend_month,
    gross_profit_year_target,
    gross_profit_month_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
ORDER BY metric_date DESC; 