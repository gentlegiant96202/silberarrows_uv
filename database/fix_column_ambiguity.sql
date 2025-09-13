-- Fix Column Name Ambiguity in Calculation Function
-- This script fixes the ambiguous column references that cause errors

-- ================================
-- DROP AND RECREATE THE CALCULATION FUNCTION
-- ================================

-- Drop the problematic function
DROP FUNCTION IF EXISTS calculate_service_metrics();

-- Create the fixed function with qualified column names
CREATE OR REPLACE FUNCTION calculate_service_metrics()
RETURNS TRIGGER AS $$
DECLARE
    target_record RECORD;
    target_year INTEGER;
    target_month INTEGER;
    v_net_sales_target DECIMAL(15,2) := 0;
    v_labour_sales_target DECIMAL(15,2) := 0;
    v_working_days_total INTEGER := 22; -- Default fallback
BEGIN
    -- Extract year and month from the metric date
    target_year := EXTRACT(YEAR FROM NEW.metric_date);
    target_month := EXTRACT(MONTH FROM NEW.metric_date);
    
    -- Get monthly targets using qualified column names
    SELECT 
        t.net_sales_target, 
        t.labour_sales_target, 
        t.number_of_working_days
    INTO 
        v_net_sales_target, 
        v_labour_sales_target, 
        v_working_days_total
    FROM service_monthly_targets t
    WHERE t.year = target_year AND t.month = target_month;
    
    -- If no targets found, use defaults
    IF NOT FOUND THEN
        v_net_sales_target := 1500000;
        v_labour_sales_target := 400000;
        v_working_days_total := 22;
    END IF;
    
    -- Calculate all metrics
    -- Current percentages
    NEW.current_net_sales_percentage := CASE 
        WHEN v_net_sales_target > 0 THEN (NEW.current_net_sales / v_net_sales_target) * 100 
        ELSE 0 
    END;
    
    NEW.current_labour_sales_percentage := CASE 
        WHEN v_labour_sales_target > 0 THEN (NEW.current_net_labor_sales / v_labour_sales_target) * 100 
        ELSE 0 
    END;
    
    -- Remaining amounts
    NEW.remaining_net_sales := v_net_sales_target - NEW.current_net_sales;
    NEW.remaining_labour_sales := v_labour_sales_target - NEW.current_net_labor_sales;
    
    -- Current daily average
    NEW.current_daily_average := CASE 
        WHEN NEW.working_days_elapsed > 0 THEN NEW.current_net_sales / NEW.working_days_elapsed 
        ELSE 0 
    END;
    
    -- Estimated totals if we continue at current pace
    NEW.estimated_net_sales := CASE 
        WHEN NEW.working_days_elapsed > 0 THEN (NEW.current_net_sales / NEW.working_days_elapsed) * v_working_days_total 
        ELSE 0 
    END;
    
    NEW.estimated_net_sales_percentage := CASE 
        WHEN v_net_sales_target > 0 THEN (NEW.estimated_net_sales / v_net_sales_target) * 100 
        ELSE 0 
    END;
    
    NEW.estimated_labor_sales := CASE 
        WHEN NEW.working_days_elapsed > 0 THEN (NEW.current_net_labor_sales / NEW.working_days_elapsed) * v_working_days_total 
        ELSE 0 
    END;
    
    NEW.estimated_labor_percentage := CASE 
        WHEN v_labour_sales_target > 0 THEN (NEW.estimated_labor_sales / v_labour_sales_target) * 100 
        ELSE 0 
    END;
    
    -- Daily average needed to reach target
    NEW.daily_average_needed := CASE 
        WHEN (v_working_days_total - NEW.working_days_elapsed) > 0 THEN 
            (v_net_sales_target - NEW.current_net_sales) / (v_working_days_total - NEW.working_days_elapsed)
        ELSE 0 
    END;
    
    -- Set update timestamp
    NEW.updated_at := CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- RECREATE THE TRIGGER
-- ================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_calculate_metrics ON daily_service_metrics;

-- Create the trigger
CREATE TRIGGER trigger_calculate_metrics
    BEFORE INSERT OR UPDATE ON daily_service_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_service_metrics();

-- ================================
-- VERIFICATION
-- ================================

SELECT 'Calculation function fixed - column ambiguity resolved!' as status; 