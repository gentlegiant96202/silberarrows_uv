-- Direct fix for percentage calculations - bypass all triggers

-- 1. Temporarily disable the trigger
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;

-- 2. Check current values
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    gross_profit_month_actual,
    gross_profit_month_target,
    marketing_spend_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06';

-- 3. Direct calculation test
SELECT 
    2170435.00 / 4698000.00 * 100 as year_calc,
    19701.00 / 414000.00 * 100 as month_calc,
    56275.00 / 19701.00 * 100 as marketing_calc;

-- 4. Update with explicit values (no calculations)
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = 46.20,
    gross_profit_month_achieved_percentage = 4.76,
    marketing_rate_against_gross_profit = 285.65
WHERE metric_date = '2025-08-06';

-- 5. Verify the update worked
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
WHERE metric_date = '2025-08-06';

-- 6. If step 4 worked, then recreate trigger with simpler logic
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
        -- Set target values
        NEW.gross_profit_year_target := target_rec.gross_profit_year_target;
        NEW.gross_profit_month_target := target_rec.gross_profit_month_target;
        NEW.total_working_days := target_rec.number_of_working_days;
        
        -- Simple percentage calculations
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
        
        NEW.average_gross_profit_per_car_month := 
            CASE WHEN NEW.total_units_sold_month > 0 
                 THEN (NEW.gross_profit_month_actual / NEW.total_units_sold_month)
                 ELSE 0 
            END;
        
        NEW.marketing_rate_against_gross_profit := 
            CASE WHEN NEW.gross_profit_month_actual > 0 
                 THEN (NEW.marketing_spend_month / NEW.gross_profit_month_actual * 100)
                 ELSE 0 
            END;
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END $$;

-- 7. Recreate the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_on_upsert();

-- 8. Final verification
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06'; 