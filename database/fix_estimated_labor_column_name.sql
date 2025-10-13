-- Fix column name from estimated_labor_percentage to estimated_labor_sales_percentage
-- This matches the TypeScript interface and frontend expectations

-- Step 1: Check if the old column exists and rename it
DO $$ 
BEGIN
    -- Check if estimated_labor_percentage exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_service_metrics' 
          AND column_name = 'estimated_labor_percentage'
    ) THEN
        -- Rename the column
        ALTER TABLE daily_service_metrics 
        RENAME COLUMN estimated_labor_percentage TO estimated_labor_sales_percentage;
        
        RAISE NOTICE 'Column renamed from estimated_labor_percentage to estimated_labor_sales_percentage';
    ELSE
        RAISE NOTICE 'Column estimated_labor_percentage does not exist, may already be renamed';
    END IF;
END $$;

-- Step 2: Update the trigger function to use the correct column name
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

    -- Calculate estimated labor sales percentage (FIX: Use correct column name)
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

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'daily_service_metrics' 
  AND column_name LIKE '%labor%'
ORDER BY ordinal_position;

