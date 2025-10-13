-- Create complete trigger with ALL correct column names

-- Drop all existing triggers
DROP TRIGGER IF EXISTS trg_calculate_daily_service_metrics ON daily_service_metrics;
DROP TRIGGER IF EXISTS trigger_calculate_metrics ON daily_service_metrics;
DROP TRIGGER IF EXISTS trigger_calculate_service_metrics ON daily_service_metrics;
DROP TRIGGER IF EXISTS auto_calculate_metrics ON daily_service_metrics;

-- Drop old functions
DROP FUNCTION IF EXISTS calculate_daily_service_metrics() CASCADE;
DROP FUNCTION IF EXISTS calculate_service_metrics() CASCADE;
DROP FUNCTION IF EXISTS trigger_calculate_metrics() CASCADE;

-- Create complete trigger function with correct column names
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

    -- Calculate current_daily_average
    IF NEW.working_days_elapsed > 0 THEN
        NEW.current_daily_average := NEW.current_net_sales / NEW.working_days_elapsed;
    ELSE
        NEW.current_daily_average := 0;
    END IF;

    -- Calculate estimated_net_sales
    IF target_record.number_of_working_days > 0 THEN
        NEW.estimated_net_sales := NEW.current_daily_average * target_record.number_of_working_days;
    ELSE
        NEW.estimated_net_sales := 0;
    END IF;

    -- Calculate estimated_net_sales_percentage
    IF target_record.net_sales_target > 0 THEN
        NEW.estimated_net_sales_percentage := ROUND((NEW.estimated_net_sales / target_record.net_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.estimated_net_sales_percentage := 0;
    END IF;

    -- Calculate current_net_sales_percentage
    IF target_record.net_sales_target > 0 THEN
        NEW.current_net_sales_percentage := ROUND((NEW.current_net_sales / target_record.net_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.current_net_sales_percentage := 0;
    END IF;

    -- Calculate remaining_net_sales
    NEW.remaining_net_sales := target_record.net_sales_target - NEW.current_net_sales;

    -- Calculate daily_average_needed (NOT required_daily_average!)
    IF target_record.number_of_working_days > NEW.working_days_elapsed THEN
        NEW.daily_average_needed := 
            (target_record.net_sales_target - NEW.current_net_sales) / 
            (target_record.number_of_working_days - NEW.working_days_elapsed);
    ELSE
        NEW.daily_average_needed := 0;
    END IF;

    -- Calculate estimated_labor_sales
    IF target_record.number_of_working_days > 0 AND NEW.working_days_elapsed > 0 THEN
        NEW.estimated_labor_sales := (NEW.current_net_labor_sales / NEW.working_days_elapsed) * target_record.number_of_working_days;
    ELSE
        NEW.estimated_labor_sales := 0;
    END IF;

    -- Calculate estimated_labor_sales_percentage
    IF target_record.labour_sales_target > 0 THEN
        NEW.estimated_labor_sales_percentage := ROUND((NEW.estimated_labor_sales / target_record.labour_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.estimated_labor_sales_percentage := 0;
    END IF;

    -- Calculate current_labour_sales_percentage
    IF target_record.labour_sales_target > 0 THEN
        NEW.current_labour_sales_percentage := ROUND((NEW.current_net_labor_sales / target_record.labour_sales_target * 100)::NUMERIC, 4);
    ELSE
        NEW.current_labour_sales_percentage := 0;
    END IF;

    -- Calculate remaining_labour_sales
    NEW.remaining_labour_sales := target_record.labour_sales_target - NEW.current_net_labor_sales;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trg_calculate_daily_service_metrics
    BEFORE INSERT OR UPDATE ON daily_service_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_daily_service_metrics();

-- Verify
SELECT 
    trigger_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'daily_service_metrics';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Complete trigger created with ALL correct column names!';
    RAISE NOTICE '   - current_daily_average ✅';
    RAISE NOTICE '   - estimated_net_sales ✅';
    RAISE NOTICE '   - estimated_net_sales_percentage ✅';
    RAISE NOTICE '   - current_net_sales_percentage ✅';
    RAISE NOTICE '   - remaining_net_sales ✅';
    RAISE NOTICE '   - daily_average_needed ✅ (NOT required_daily_average)';
    RAISE NOTICE '   - estimated_labor_sales ✅';
    RAISE NOTICE '   - estimated_labor_sales_percentage ✅ (NOT estimated_labor_percentage)';
    RAISE NOTICE '   - current_labour_sales_percentage ✅';
    RAISE NOTICE '   - remaining_labour_sales ✅';
END $$;

