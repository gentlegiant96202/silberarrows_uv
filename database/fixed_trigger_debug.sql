-- Fixed trigger debugging - drop trigger first

-- 1. Drop trigger first, then function
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;
DROP FUNCTION IF EXISTS calculate_sales_metrics_final();

-- 2. Create new function with logging
CREATE OR REPLACE FUNCTION calculate_sales_metrics_final()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    year_tgt   NUMERIC;
    month_tgt  NUMERIC;
    total_u    INTEGER;
    working_days INTEGER;
BEGIN
    RAISE NOTICE 'TRIGGER STARTED for date: %', NEW.metric_date;
    RAISE NOTICE 'Input values - Year actual: %, Month actual: %', NEW.gross_sales_year_actual, NEW.gross_sales_month_actual;
    
    -- Calculate gross profits
    NEW.gross_profit_year_actual := COALESCE(NEW.gross_sales_year_actual, 0) - COALESCE(NEW.cost_of_sales_year_actual, 0);
    NEW.gross_profit_month_actual := COALESCE(NEW.gross_sales_month_actual, 0) - COALESCE(NEW.cost_of_sales_month_actual, 0);
    
    RAISE NOTICE 'Calculated profits - Year: %, Month: %', NEW.gross_profit_year_actual, NEW.gross_profit_month_actual;
    
    -- Calculate total units
    total_u := COALESCE(NEW.units_sold_stock_month, 0) + COALESCE(NEW.units_sold_consignment_month, 0);
    NEW.total_units_sold_month := total_u;
    
    RAISE NOTICE 'Total units: %', total_u;
    
    -- Get targets
    SELECT gross_profit_year_target, gross_profit_month_target, number_of_working_days
    INTO year_tgt, month_tgt, working_days
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month;
    
    IF FOUND THEN
        RAISE NOTICE 'Found targets - Year: %, Month: %, Working days: %', year_tgt, month_tgt, working_days;
        NEW.gross_profit_year_target := year_tgt;
        NEW.gross_profit_month_target := month_tgt;
        NEW.total_working_days := working_days;
    ELSE
        RAISE NOTICE 'NO TARGETS FOUND for year % month %', NEW.year, NEW.month;
        year_tgt := 0;
        month_tgt := 0;
        working_days := 0;
    END IF;
    
    -- Calculate percentages
    IF year_tgt > 0 THEN
        NEW.gross_profit_year_achieved_percentage := ROUND((NEW.gross_profit_year_actual / year_tgt * 100), 2);
        RAISE NOTICE 'Year percentage calculated: %', NEW.gross_profit_year_achieved_percentage;
    ELSE
        NEW.gross_profit_year_achieved_percentage := 0;
        RAISE NOTICE 'Year percentage set to 0 (target was 0 or null)';
    END IF;
    
    IF month_tgt > 0 THEN
        NEW.gross_profit_month_achieved_percentage := ROUND((NEW.gross_profit_month_actual / month_tgt * 100), 2);
        RAISE NOTICE 'Month percentage calculated: %', NEW.gross_profit_month_achieved_percentage;
    ELSE
        NEW.gross_profit_month_achieved_percentage := 0;
        RAISE NOTICE 'Month percentage set to 0 (target was 0 or null)';
    END IF;
    
    -- Calculate profit per car
    IF total_u > 0 THEN
        NEW.average_gross_profit_per_car_month := ROUND((NEW.gross_profit_month_actual / total_u), 2);
        RAISE NOTICE 'Profit per car calculated: %', NEW.average_gross_profit_per_car_month;
    ELSE
        NEW.average_gross_profit_per_car_month := 0;
        RAISE NOTICE 'Profit per car set to 0 (no units sold)';
    END IF;
    
    -- Calculate marketing rate
    IF NEW.gross_profit_month_actual > 0 THEN
        NEW.marketing_rate_against_gross_profit := ROUND((COALESCE(NEW.marketing_spend_month, 0) / NEW.gross_profit_month_actual * 100), 2);
        RAISE NOTICE 'Marketing rate calculated: %', NEW.marketing_rate_against_gross_profit;
    ELSE
        NEW.marketing_rate_against_gross_profit := 0;
        RAISE NOTICE 'Marketing rate set to 0 (no gross profit)';
    END IF;
    
    RAISE NOTICE 'TRIGGER COMPLETED - Final values: Year %%, Month %%, Profit/Car %, Marketing %%', 
        NEW.gross_profit_year_achieved_percentage, 
        NEW.gross_profit_month_achieved_percentage,
        NEW.average_gross_profit_per_car_month,
        NEW.marketing_rate_against_gross_profit;
    
    RETURN NEW;
END;
$$;

-- 3. Recreate the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_final();

-- 4. Test with a direct insert
INSERT INTO sales_daily_metrics (
    metric_date, year, month, working_days_elapsed,
    gross_sales_year_actual, cost_of_sales_year_actual,
    gross_sales_month_actual, cost_of_sales_month_actual,
    marketing_spend_month,
    units_sold_stock_month, units_sold_consignment_month
) VALUES (
    '2025-08-15', 2025, 8, 15,
    2900000, 1500000,
    110000, 50000,
    30000,
    2, 1
);

-- 5. Check the result
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_month_actual,
    gross_profit_year_target,
    gross_profit_month_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    average_gross_profit_per_car_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-15'; 