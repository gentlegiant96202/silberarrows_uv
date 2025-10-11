-- =====================================================
-- Create Trigger to Auto-Recalculate Metrics When Targets Change
-- =====================================================

-- STEP 1: Create function to recalculate metrics when target changes
CREATE OR REPLACE FUNCTION recalculate_metrics_on_target_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- When a target is updated (or inserted), recalculate all metrics for that month
    RAISE NOTICE 'Target changed for year %, month %. Recalculating all metrics...', NEW.year, NEW.month;
    
    -- Update all metrics for this month to trigger their calculation
    UPDATE daily_service_metrics
    SET updated_at = NOW()
    WHERE EXTRACT(YEAR FROM metric_date) = NEW.year
      AND EXTRACT(MONTH FROM metric_date) = NEW.month;
    
    RAISE NOTICE 'Recalculation complete for year %, month %', NEW.year, NEW.month;
    
    RETURN NEW;
END;
$$;

-- STEP 2: Create the trigger
DROP TRIGGER IF EXISTS trigger_recalculate_on_target_change ON service_monthly_targets;

CREATE TRIGGER trigger_recalculate_on_target_change
    AFTER INSERT OR UPDATE ON service_monthly_targets
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_metrics_on_target_change();

-- STEP 3: Verify trigger was created
SELECT 
    'Trigger Created Successfully!' as status,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'trigger_recalculate_on_target_change';

SELECT '
✅ CASCADE TRIGGER INSTALLED!

Now when you update a target (e.g., change number_of_working_days),
ALL metrics for that month will automatically recalculate.

Test it:
UPDATE service_monthly_targets 
SET number_of_working_days = 27 
WHERE year = 2025 AND month = 10;

This will now automatically recalculate all October 2025 metrics!
' as instructions;


