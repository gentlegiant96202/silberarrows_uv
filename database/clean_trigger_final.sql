-- Clean trigger function (no debug logging) - final version

-- 1. Drop trigger first, then function
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;
DROP FUNCTION IF EXISTS calculate_sales_metrics_final();

-- 2. Create clean function without debug logging
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
    -- Calculate gross profits
    NEW.gross_profit_year_actual := COALESCE(NEW.gross_sales_year_actual, 0) - COALESCE(NEW.cost_of_sales_year_actual, 0);
    NEW.gross_profit_month_actual := COALESCE(NEW.gross_sales_month_actual, 0) - COALESCE(NEW.cost_of_sales_month_actual, 0);
    
    -- Calculate total units
    total_u := COALESCE(NEW.units_sold_stock_month, 0) + COALESCE(NEW.units_sold_consignment_month, 0);
    NEW.total_units_sold_month := total_u;
    
    -- Get targets
    SELECT gross_profit_year_target, gross_profit_month_target, number_of_working_days
    INTO year_tgt, month_tgt, working_days
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month;
    
    IF FOUND THEN
        NEW.gross_profit_year_target := year_tgt;
        NEW.gross_profit_month_target := month_tgt;
        NEW.total_working_days := working_days;
    ELSE
        year_tgt := 0;
        month_tgt := 0;
        working_days := 0;
    END IF;
    
    -- Calculate percentages
    IF year_tgt > 0 THEN
        NEW.gross_profit_year_achieved_percentage := ROUND((NEW.gross_profit_year_actual / year_tgt * 100), 2);
    ELSE
        NEW.gross_profit_year_achieved_percentage := 0;
    END IF;
    
    IF month_tgt > 0 THEN
        NEW.gross_profit_month_achieved_percentage := ROUND((NEW.gross_profit_month_actual / month_tgt * 100), 2);
    ELSE
        NEW.gross_profit_month_achieved_percentage := 0;
    END IF;
    
    -- Calculate profit per car
    IF total_u > 0 THEN
        NEW.average_gross_profit_per_car_month := ROUND((NEW.gross_profit_month_actual / total_u), 2);
    ELSE
        NEW.average_gross_profit_per_car_month := 0;
    END IF;
    
    -- Calculate marketing rate
    IF NEW.gross_profit_month_actual > 0 THEN
        NEW.marketing_rate_against_gross_profit := ROUND((COALESCE(NEW.marketing_spend_month, 0) / NEW.gross_profit_month_actual * 100), 2);
    ELSE
        NEW.marketing_rate_against_gross_profit := 0;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 3. Recreate the trigger
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_final();

-- 4. Update existing rows to recalculate them with the clean function
UPDATE sales_daily_metrics 
SET updated_at = NOW()
WHERE year = 2025 AND month = 8; 