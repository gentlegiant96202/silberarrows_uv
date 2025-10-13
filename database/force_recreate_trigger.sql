-- Force drop and recreate the trigger with correct column name

-- Step 1: Drop existing trigger
DROP TRIGGER IF EXISTS trg_calculate_daily_service_metrics ON daily_service_metrics;

-- Step 2: Drop existing function
DROP FUNCTION IF EXISTS calculate_daily_service_metrics();

-- Step 3: Create the function with CORRECT column names
CREATE OR REPLACE FUNCTION calculate_daily_service_metrics()
RETURNS TRIGGER AS $$
DECLARE
    target_record RECORD;
BEGIN
    -- Get the target for this month
    SELECT * INTO target_record
    FROM service_monthly_targets
    WHERE year = EXTRACT(YEAR FROM NEW.metric_date)
      AND month = EXTRACT(MONTH FROM NEW.metric_date);

    IF target_record IS NULL THEN
        RAISE NOTICE 'No target found for % %', EXTRACT(YEAR FROM NEW.metric_date), EXTRACT(MONTH FROM NEW.metric_date);
        RETURN NEW;
    END IF;

    -- Calculate working days elapsed
    NEW.working_days_elapsed := LEAST(
        (EXTRACT(DAY FROM NEW.metric_date)::INTEGER),
        target_record.number_of_working_days
    );

    -- Calculate daily average
    IF NEW.working_days_elapsed > 0 THEN
        NEW.current_daily_average := NEW.current_net_sales / NEW.working_days_elapsed;
    ELSE
        NEW.current_daily_average := 0;
    END IF;

    -- Calculate required daily average
    IF target_record.number_of_working_days > NEW.working_days_elapsed THEN
        NEW.required_daily_average := 
            (target_record.net_sales_target - NEW.current_net_sales) / 
            (target_record.number_of_working_days - NEW.working_days_elapsed);
    ELSE
        NEW.required_daily_average := 0;
    END IF;

    -- Calculate estimated net sales
    IF target_record.number_of_working_days > 0 THEN
        NEW.estimated_net_sales := NEW.current_daily_average * target_record.number_of_working_days;
    ELSE
        NEW.estimated_net_sales := 0;
    END IF;

    -- Calculate estimated net sales percentage
    IF target_record.net_sales_target > 0 THEN
        NEW.estimated_net_sales_percentage := ROUND((NEW.estimated_net_sales / target_record.net_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.estimated_net_sales_percentage := 0;
    END IF;

    -- Calculate current net sales percentage
    IF target_record.net_sales_target > 0 THEN
        NEW.current_net_sales_percentage := ROUND((NEW.current_net_sales / target_record.net_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.current_net_sales_percentage := 0;
    END IF;

    -- Calculate estimated labor sales
    IF target_record.number_of_working_days > 0 AND NEW.working_days_elapsed > 0 THEN
        NEW.estimated_labor_sales := (NEW.current_net_labor_sales / NEW.working_days_elapsed) * target_record.number_of_working_days;
    ELSE
        NEW.estimated_labor_sales := 0;
    END IF;

    -- ✅ CORRECT: Use estimated_labor_sales_percentage (NOT estimated_labor_percentage)
    IF target_record.labour_sales_target > 0 THEN
        NEW.estimated_labor_sales_percentage := ROUND((NEW.estimated_labor_sales / target_record.labour_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.estimated_labor_sales_percentage := 0;
    END IF;

    -- Calculate current labour sales percentage
    IF target_record.labour_sales_target > 0 THEN
        NEW.current_labour_sales_percentage := ROUND((NEW.current_net_labor_sales / target_record.labour_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.current_labour_sales_percentage := 0;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the trigger
CREATE TRIGGER trg_calculate_daily_service_metrics
    BEFORE INSERT OR UPDATE ON daily_service_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_daily_service_metrics();

-- Step 5: Verify
SELECT 
    trigger_name, 
    event_manipulation, 
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'daily_service_metrics'
ORDER BY trigger_name;

-- Step 6: Show function definition to confirm
SELECT pg_get_functiondef('calculate_daily_service_metrics'::regproc);

