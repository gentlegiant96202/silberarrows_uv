-- Check and Create Calculation Triggers for Service Metrics
-- This script checks for existing triggers and creates the missing calculation trigger

-- ================================
-- STEP 1: CHECK EXISTING TRIGGERS
-- ================================

-- Check what triggers exist on daily_service_metrics table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'daily_service_metrics'
ORDER BY trigger_name;

-- ================================
-- STEP 2: CREATE CALCULATION FUNCTION
-- ================================

-- Drop and recreate the calculation function
DROP FUNCTION IF EXISTS calculate_service_metrics();

CREATE OR REPLACE FUNCTION calculate_service_metrics()
RETURNS TRIGGER AS $$
DECLARE
    target_row RECORD;
    net_sales_target DECIMAL(15,2) := 0;
    labour_sales_target DECIMAL(15,2) := 0;
    working_days_target INTEGER := 0;
BEGIN
    -- Get the monthly targets for this date
    SELECT * INTO target_row
    FROM service_monthly_targets 
    WHERE year = EXTRACT(YEAR FROM NEW.metric_date::date)
      AND month = EXTRACT(MONTH FROM NEW.metric_date::date)
    LIMIT 1;
    
    -- Set target values (use 0 if no target found to avoid division by zero)
    IF target_row IS NOT NULL THEN
        net_sales_target := COALESCE(target_row.net_sales_target, 0);
        labour_sales_target := COALESCE(target_row.labour_sales_target, 0);
        working_days_target := COALESCE(target_row.number_of_working_days, 1);
    ELSE
        -- Default values to prevent division by zero
        net_sales_target := 1;
        labour_sales_target := 1;
        working_days_target := 1;
    END IF;
    
    -- Calculate percentages (avoid division by zero)
    NEW.current_net_sales_percentage := CASE 
        WHEN net_sales_target > 0 THEN (NEW.current_net_sales / net_sales_target) * 100
        ELSE 0 
    END;
    
    NEW.current_labour_sales_percentage := CASE 
        WHEN labour_sales_target > 0 THEN (NEW.current_net_labor_sales / labour_sales_target) * 100
        ELSE 0 
    END;
    
    -- Calculate remaining amounts
    NEW.remaining_net_sales := net_sales_target - NEW.current_net_sales;
    NEW.remaining_labour_sales := labour_sales_target - NEW.current_net_labor_sales;
    
    -- Calculate daily average (avoid division by zero)
    NEW.current_daily_average := CASE 
        WHEN NEW.working_days_elapsed > 0 THEN NEW.current_net_sales / NEW.working_days_elapsed
        ELSE 0 
    END;
    
    -- Calculate estimated totals based on full month
    NEW.estimated_net_sales := CASE 
        WHEN NEW.working_days_elapsed > 0 AND working_days_target > 0 THEN 
            (NEW.current_net_sales / NEW.working_days_elapsed) * working_days_target
        ELSE NEW.current_net_sales 
    END;
    
    NEW.estimated_labor_sales := CASE 
        WHEN NEW.working_days_elapsed > 0 AND working_days_target > 0 THEN 
            (NEW.current_net_labor_sales / NEW.working_days_elapsed) * working_days_target
        ELSE NEW.current_net_labor_sales 
    END;
    
    -- Calculate estimated percentages
    NEW.estimated_net_sales_percentage := CASE 
        WHEN net_sales_target > 0 THEN (NEW.estimated_net_sales / net_sales_target) * 100
        ELSE 0 
    END;
    
    NEW.estimated_labor_sales_percentage := CASE 
        WHEN labour_sales_target > 0 THEN (NEW.estimated_labor_sales / labour_sales_target) * 100
        ELSE 0 
    END;
    
    -- Calculate daily average needed for remaining days
    NEW.daily_average_needed := CASE 
        WHEN (working_days_target - NEW.working_days_elapsed) > 0 THEN 
            NEW.remaining_net_sales / (working_days_target - NEW.working_days_elapsed)
        ELSE 0 
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- STEP 3: CREATE TRIGGER
-- ================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_calculate_service_metrics ON daily_service_metrics;

-- Create the trigger
CREATE TRIGGER trigger_calculate_service_metrics
    BEFORE INSERT OR UPDATE ON daily_service_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_service_metrics();

-- ================================
-- STEP 4: VERIFY TRIGGER CREATION
-- ================================

-- Check that the trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    'Trigger created successfully' as status
FROM information_schema.triggers 
WHERE event_object_table = 'daily_service_metrics'
  AND trigger_name = 'trigger_calculate_service_metrics';

-- ================================
-- STEP 5: TEST THE TRIGGER
-- ================================

-- Test by updating an existing record to see if calculations work
-- (This will only show something if there are existing records)
UPDATE daily_service_metrics 
SET updated_at = NOW()
WHERE metric_date = (
    SELECT metric_date 
    FROM daily_service_metrics 
    ORDER BY metric_date DESC 
    LIMIT 1
)
RETURNING 
    metric_date,
    current_net_sales,
    current_net_sales_percentage,
    estimated_net_sales,
    'Calculation test completed' as test_status;

SELECT 'Calculation triggers setup completed successfully!' as final_status; 