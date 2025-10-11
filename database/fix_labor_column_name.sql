-- =====================================================
-- Fix Labor Column Name Mismatch
-- =====================================================

-- STEP 1: Check current column names
SELECT 
    'STEP 1: Current Columns' as step,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'daily_service_metrics'
  AND (column_name LIKE '%labor%' OR column_name LIKE '%labour%')
ORDER BY column_name;

-- STEP 2: Rename the column to match frontend expectation
-- Frontend expects: estimated_labor_sales_percentage
-- Database has: estimated_labor_percentage
ALTER TABLE daily_service_metrics 
RENAME COLUMN estimated_labor_percentage 
TO estimated_labor_sales_percentage;

-- STEP 3: Update the trigger function to use correct column name
CREATE OR REPLACE FUNCTION calculate_service_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_working_days_total INTEGER;
    v_net_sales_target NUMERIC;
    v_labour_sales_target NUMERIC;
BEGIN
    -- Get target data for this month
    SELECT 
        number_of_working_days,
        net_sales_target,
        labour_sales_target
    INTO 
        v_working_days_total,
        v_net_sales_target,
        v_labour_sales_target
    FROM service_monthly_targets
    WHERE year = EXTRACT(YEAR FROM NEW.metric_date)
      AND month = EXTRACT(MONTH FROM NEW.metric_date);
    
    -- If no target found, return without calculating
    IF v_working_days_total IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Calculate percentages
    NEW.current_net_sales_percentage := CASE 
        WHEN v_net_sales_target > 0 THEN (NEW.current_net_sales / v_net_sales_target) * 100
        ELSE 0 
    END;
    
    NEW.current_labour_sales_percentage := CASE 
        WHEN v_labour_sales_target > 0 THEN (NEW.current_net_labor_sales / v_labour_sales_target) * 100
        ELSE 0 
    END;
    
    -- Calculate remaining amounts
    NEW.remaining_net_sales := v_net_sales_target - NEW.current_net_sales;
    NEW.remaining_labour_sales := v_labour_sales_target - NEW.current_net_labor_sales;
    
    -- Calculate daily average
    NEW.current_daily_average := CASE 
        WHEN NEW.working_days_elapsed > 0 THEN NEW.current_net_sales / NEW.working_days_elapsed 
        ELSE 0 
    END;
    
    -- Calculate estimated net sales
    NEW.estimated_net_sales := CASE 
        WHEN NEW.working_days_elapsed > 0 AND v_working_days_total > 0 THEN 
            (NEW.current_net_sales / NEW.working_days_elapsed) * v_working_days_total
        ELSE NEW.current_net_sales 
    END;
    
    -- Calculate estimated labor sales
    NEW.estimated_labor_sales := CASE 
        WHEN NEW.working_days_elapsed > 0 AND v_working_days_total > 0 THEN 
            (NEW.current_net_labor_sales / NEW.working_days_elapsed) * v_working_days_total
        ELSE NEW.current_net_labor_sales 
    END;
    
    -- Calculate estimated percentages
    NEW.estimated_net_sales_percentage := CASE 
        WHEN v_net_sales_target > 0 THEN (NEW.estimated_net_sales / v_net_sales_target) * 100
        ELSE 0 
    END;
    
    -- FIX: Use renamed column
    NEW.estimated_labor_sales_percentage := CASE 
        WHEN v_labour_sales_target > 0 THEN (NEW.estimated_labor_sales / v_labour_sales_target) * 100
        ELSE 0 
    END;
    
    -- Calculate daily average needed for remaining days
    NEW.daily_average_needed := CASE 
        WHEN (v_working_days_total - NEW.working_days_elapsed) > 0 THEN 
            NEW.remaining_net_sales / (v_working_days_total - NEW.working_days_elapsed)
        ELSE 0 
    END;
    
    RETURN NEW;
END;
$$;

-- STEP 4: Force recalculation of all October 2025 data
UPDATE daily_service_metrics 
SET updated_at = NOW() 
WHERE EXTRACT(YEAR FROM metric_date) = 2025 
  AND EXTRACT(MONTH FROM metric_date) = 10;

-- STEP 5: Verify the fix
SELECT 
    'STEP 5: After Fix' as step,
    metric_date,
    estimated_labor_sales,
    estimated_labor_sales_percentage,
    CASE 
        WHEN estimated_labor_sales_percentage > 0 
        THEN '✅ FIXED!'
        ELSE '❌ Still 0'
    END as status
FROM daily_service_metrics
WHERE metric_date = '2025-10-09';

SELECT '
✅ DONE!
- Column renamed to estimated_labor_sales_percentage
- Trigger updated to use correct column name
- All October 2025 data recalculated
- Refresh your dashboard to see progress bar!
' as result;


