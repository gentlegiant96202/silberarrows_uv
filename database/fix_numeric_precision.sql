-- Fix Numeric Field Precision Issues
-- This script updates the precision of calculated fields to handle large values

-- ================================
-- STEP 1: UPDATE CALCULATED FIELDS PRECISION
-- ================================

-- Fix calculated metrics that can have large values
ALTER TABLE daily_service_metrics 
ALTER COLUMN current_net_sales_percentage TYPE DECIMAL(10,4),
ALTER COLUMN current_labour_sales_percentage TYPE DECIMAL(10,4),
ALTER COLUMN remaining_net_sales TYPE DECIMAL(15,2),
ALTER COLUMN remaining_labour_sales TYPE DECIMAL(15,2),
ALTER COLUMN current_daily_average TYPE DECIMAL(15,2),
ALTER COLUMN estimated_net_sales TYPE DECIMAL(15,2),
ALTER COLUMN estimated_net_sales_percentage TYPE DECIMAL(10,4),
ALTER COLUMN estimated_labor_sales TYPE DECIMAL(15,2),
ALTER COLUMN estimated_labor_sales_percentage TYPE DECIMAL(10,4),
ALTER COLUMN daily_average_needed TYPE DECIMAL(15,2);

-- ================================
-- STEP 2: RECREATE THE CALCULATION FUNCTION WITH PROPER PRECISION
-- ================================

-- Drop and recreate the calculation function
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
    
    IF labour_sales_target > 0 THEN
        NEW.estimated_labor_sales_percentage := ROUND((NEW.estimated_labor_sales / labour_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.estimated_labor_sales_percentage := 0;
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
-- STEP 3: RECREATE THE TRIGGER
-- ================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_calculate_metrics ON daily_service_metrics;

-- Create the trigger
CREATE TRIGGER trigger_calculate_metrics
    BEFORE INSERT OR UPDATE ON daily_service_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_service_metrics();

-- ================================
-- STEP 4: VERIFICATION
-- ================================

-- Check the updated column types
SELECT 
    column_name,
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'daily_service_metrics' 
AND column_name IN (
    'current_net_sales_percentage',
    'current_labour_sales_percentage', 
    'remaining_net_sales',
    'remaining_labour_sales',
    'current_daily_average',
    'estimated_net_sales',
    'estimated_net_sales_percentage',
    'estimated_labor_sales',
    'estimated_labor_sales_percentage',
    'daily_average_needed'
)
ORDER BY column_name;

SELECT 'Numeric precision fixed and calculation function updated successfully!' as message; 