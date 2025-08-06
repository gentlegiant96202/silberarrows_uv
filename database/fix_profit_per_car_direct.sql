-- Fix profit per car - should be 19,701.00 ÷ 1 = 19,701.00

-- 1. Manual calculation test
SELECT 
    19701.00 / 1 as expected_avg_profit,
    19701.00::DECIMAL / 1::DECIMAL as with_casting;

-- 2. Direct update with the correct value
UPDATE sales_daily_metrics 
SET average_gross_profit_per_car_month = 19701.00
WHERE metric_date = '2025-08-06';

-- 3. Verify the fix
SELECT 
    metric_date,
    units_sold_stock_month,
    units_sold_consignment_month,
    total_units_sold_month,
    gross_profit_month_actual,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06';

-- 4. Fix the trigger to handle this calculation properly
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;

CREATE OR REPLACE FUNCTION calculate_sales_metrics_on_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
    total_units INTEGER;
BEGIN
    -- Calculate total units sold first
    total_units := COALESCE(NEW.units_sold_stock_month, 0) + COALESCE(NEW.units_sold_consignment_month, 0);
    NEW.total_units_sold_month := total_units;
    
    -- Get target data for this month
    SELECT * INTO target_rec
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month;
    
    IF FOUND THEN
        -- Set target values
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
        
        -- Calculate average profit per car (fixed)
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
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END $$;

-- Recreate the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_on_upsert();

-- 5. Test the trigger by updating a field
UPDATE sales_daily_metrics 
SET updated_at = NOW()
WHERE metric_date = '2025-08-06';

-- 6. Final verification
SELECT 
    metric_date,
    units_sold_stock_month,
    units_sold_consignment_month,
    total_units_sold_month,
    gross_profit_month_actual,
    average_gross_profit_per_car_month,
    -- Expected: 19701.00
    (gross_profit_month_actual / total_units_sold_month) as expected_calculation
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06'; 