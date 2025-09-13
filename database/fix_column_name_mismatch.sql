-- Fix Column Name Mismatch in Calculation Function
-- This script fixes the column name reference in the trigger function

-- ================================
-- STEP 1: UPDATE THE CALCULATION FUNCTION WITH CORRECT COLUMN NAME
-- ================================

-- Drop and recreate the calculation function with correct column name
DROP FUNCTION IF EXISTS calculate_service_metrics();

CREATE OR REPLACE FUNCTION calculate_service_metrics()
RETURNS TRIGGER AS $$
DECLARE
    target_record RECORD;
    target_year INTEGER;
    target_month INTEGER;
    net_sales_target DECIMAL(15,2) := 0;
    labour_sales_target DECIMAL(15,2) := 0;
    working_days_total INTEGER := 22; -- Default fallback
BEGIN
    -- Extract year and month from the metric date
    target_year := EXTRACT(YEAR FROM NEW.metric_date);
    target_month := EXTRACT(MONTH FROM NEW.metric_date);
    
    -- Get monthly targets
    SELECT net_sales_target, labour_sales_target, number_of_working_days
    INTO target_record
    FROM service_monthly_targets
    WHERE year = target_year AND month = target_month;
    
    -- Use targets if found, otherwise use defaults
    IF target_record IS NOT NULL THEN
        net_sales_target := target_record.net_sales_target;
        labour_sales_target := target_record.labour_sales_target;
        working_days_total := target_record.number_of_working_days;
    END IF;
    
    -- Skip calculation if no targets (avoid division by zero)
    IF net_sales_target = 0 OR labour_sales_target = 0 OR working_days_total = 0 THEN
        RETURN NEW;
    END IF;
    
    -- Calculate percentages and remaining values
    NEW.current_net_sales_percentage := ROUND((NEW.current_net_sales / net_sales_target * 100)::NUMERIC, 4);
    NEW.current_labour_sales_percentage := ROUND((NEW.current_net_labor_sales / labour_sales_target * 100)::NUMERIC, 4);
    
    NEW.remaining_net_sales := net_sales_target - NEW.current_net_sales;
    NEW.remaining_labour_sales := labour_sales_target - NEW.current_net_labor_sales;
    
    -- Calculate daily averages
    IF NEW.working_days_elapsed > 0 THEN
        NEW.current_daily_average := ROUND((NEW.current_net_sales / NEW.working_days_elapsed)::NUMERIC, 2);
    ELSE
        NEW.current_daily_average := 0;
    END IF;
    
    -- Calculate estimated values
    NEW.estimated_net_sales := ROUND((NEW.current_daily_average * working_days_total)::NUMERIC, 2);
    
    IF net_sales_target > 0 THEN
        NEW.estimated_net_sales_percentage := ROUND((NEW.estimated_net_sales / net_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.estimated_net_sales_percentage := 0;
    END IF;
    
    -- Calculate estimated labor sales (assuming same growth rate)
    IF NEW.current_net_sales > 0 THEN
        NEW.estimated_labor_sales := ROUND((NEW.current_net_labor_sales * NEW.estimated_net_sales / NEW.current_net_sales)::NUMERIC, 2);
    ELSE
        NEW.estimated_labor_sales := 0;
    END IF;
    
    -- FIX: Use correct column name (estimated_labor_percentage instead of estimated_labor_sales_percentage)
    IF labour_sales_target > 0 THEN
        NEW.estimated_labor_percentage := ROUND((NEW.estimated_labor_sales / labour_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.estimated_labor_percentage := 0;
    END IF;
    
    -- Calculate daily average needed for remaining days
    IF (working_days_total - NEW.working_days_elapsed) > 0 THEN
        NEW.daily_average_needed := ROUND((NEW.remaining_net_sales / (working_days_total - NEW.working_days_elapsed))::NUMERIC, 2);
    ELSE
        NEW.daily_average_needed := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- STEP 2: RECREATE THE TRIGGER
-- ================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_calculate_metrics ON daily_service_metrics;

-- Create the trigger
CREATE TRIGGER trigger_calculate_metrics
    BEFORE INSERT OR UPDATE ON daily_service_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_service_metrics();

-- ================================
-- STEP 3: TEST THE FIX
-- ================================

-- Test with a sample update to trigger calculations
-- This will help verify the function works without column name errors
UPDATE daily_service_metrics 
SET updated_at = NOW() 
WHERE metric_date = (SELECT metric_date FROM daily_service_metrics LIMIT 1);

SELECT 'Column name mismatch fixed and trigger updated successfully!' as message; 