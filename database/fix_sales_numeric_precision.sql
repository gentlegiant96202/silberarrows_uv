-- Fix Numeric Field Precision Issues in Sales Daily Metrics
-- This script updates the precision of calculated percentage fields to handle large values
-- Problem: DECIMAL(5,2) for percentages can only handle up to 999.99%
-- Solution: Increase to DECIMAL(10,2) to handle percentages up to 99,999,999.99%

-- ================================
-- STEP 1: UPDATE PERCENTAGE FIELDS PRECISION
-- ================================

-- Fix percentage fields that can have large values when gross profit is low
ALTER TABLE sales_daily_metrics 
ALTER COLUMN gross_profit_year_achieved_percentage TYPE DECIMAL(10,2),
ALTER COLUMN gross_profit_month_achieved_percentage TYPE DECIMAL(10,2),
ALTER COLUMN marketing_rate_against_gross_profit TYPE DECIMAL(10,2);

-- ================================
-- STEP 2: RECREATE ANY TRIGGERS WITH PROPER PRECISION
-- ================================

-- Check if there's a sales calculation trigger and recreate it if needed
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;

-- Create/Update the sales calculation function to handle precision properly
CREATE OR REPLACE FUNCTION calculate_sales_metrics()
RETURNS TRIGGER AS $$
DECLARE
    target_record RECORD;
    target_year INTEGER;
    target_month INTEGER;
    gross_profit_year_target DECIMAL(15,2) := 0;
    gross_profit_month_target DECIMAL(15,2) := 0;
    total_working_days INTEGER := 22; -- Default fallback
BEGIN
    -- Extract year and month from the metric date
    target_year := EXTRACT(YEAR FROM NEW.metric_date);
    target_month := EXTRACT(MONTH FROM NEW.metric_date);
    
    -- Get monthly targets
    SELECT 
        t.gross_profit_year_target, 
        t.gross_profit_month_target, 
        t.number_of_working_days
    INTO 
        gross_profit_year_target, 
        gross_profit_month_target, 
        total_working_days
    FROM sales_monthly_targets t
    WHERE t.year = target_year AND t.month = target_month;
    
    -- If no targets found, use defaults to prevent division by zero
    IF NOT FOUND THEN
        gross_profit_year_target := 10000000; -- 10M AED default
        gross_profit_month_target := 1000000;  -- 1M AED default
        total_working_days := 22;
    END IF;
    
    -- Update target fields in the record
    NEW.gross_profit_year_target := gross_profit_year_target;
    NEW.gross_profit_month_target := gross_profit_month_target;
    NEW.total_working_days := total_working_days;
    
    -- Calculate year achievement percentage (avoid division by zero)
    NEW.gross_profit_year_achieved_percentage := CASE 
        WHEN gross_profit_year_target > 0 THEN 
            ROUND((NEW.gross_profit_year_actual / gross_profit_year_target * 100)::NUMERIC, 2)
        ELSE 0 
    END;
    
    -- Calculate month achievement percentage (avoid division by zero)
    NEW.gross_profit_month_achieved_percentage := CASE 
        WHEN gross_profit_month_target > 0 THEN 
            ROUND((NEW.gross_profit_month_actual / gross_profit_month_target * 100)::NUMERIC, 2)
        ELSE 0 
    END;
    
    -- Calculate average gross profit per car (avoid division by zero)
    NEW.average_gross_profit_per_car_month := CASE 
        WHEN NEW.total_units_sold_month > 0 THEN 
            ROUND((NEW.gross_profit_month_actual / NEW.total_units_sold_month)::NUMERIC, 2)
        ELSE 0 
    END;
    
    -- Calculate marketing rate against gross profit (avoid division by zero)
    NEW.marketing_rate_against_gross_profit := CASE 
        WHEN NEW.gross_profit_month_actual > 0 THEN 
            ROUND((NEW.marketing_spend_month / NEW.gross_profit_month_actual * 100)::NUMERIC, 2)
        ELSE 0 
    END;
    
    -- Set update timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- STEP 3: CREATE THE TRIGGER
-- ================================

-- Create the trigger to automatically calculate metrics
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics();

-- ================================
-- STEP 4: VERIFICATION
-- ================================

-- Verify the changes
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'sales_daily_metrics' 
AND column_name IN (
    'gross_profit_year_achieved_percentage',
    'gross_profit_month_achieved_percentage', 
    'marketing_rate_against_gross_profit'
)
ORDER BY column_name;

-- Test message
SELECT 'Sales numeric precision fixed - percentage fields can now handle large values!' as status; 