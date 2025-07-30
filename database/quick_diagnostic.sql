-- Quick Diagnostic for Service Department 100x Error
-- Run this to see current data and calculations

-- 1. Check current input data
SELECT 'CURRENT INPUT DATA' as check_type;
SELECT 
    metric_name,
    metric_value,
    unit
FROM service_metrics 
WHERE metric_date = CURRENT_DATE 
  AND metric_category = 'input'
ORDER BY metric_name;

-- 2. Check current targets
SELECT 'CURRENT TARGETS' as check_type;
SELECT 
    net_sales_target,
    labour_sales_target,
    number_of_working_days
FROM service_monthly_targets 
WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) 
  AND month = EXTRACT(MONTH FROM CURRENT_DATE);

-- 3. Check calculated values (before fix)
SELECT 'CALCULATED VALUES (BEFORE FIX)' as check_type;
SELECT 
    metric_name,
    metric_value,
    unit
FROM service_metrics 
WHERE metric_date = CURRENT_DATE 
  AND metric_category = 'calculated'
  AND metric_name IN ('estimated_net_sales', 'current_daily_average', 'current_net_sales_percentage')
ORDER BY metric_name;

-- 4. Manual calculation check
DO $$
DECLARE
    input_days DECIMAL;
    input_sales DECIMAL;
    target_days INTEGER;
    target_sales DECIMAL;
    manual_daily_avg DECIMAL;
    manual_estimated DECIMAL;
BEGIN
    -- Get values
    SELECT COALESCE(metric_value, 0) INTO input_days
    FROM service_metrics 
    WHERE metric_date = CURRENT_DATE AND metric_name = 'working_days_elapsed';
    
    SELECT COALESCE(metric_value, 0) INTO input_sales
    FROM service_metrics 
    WHERE metric_date = CURRENT_DATE AND metric_name = 'current_net_sales';
    
    SELECT number_of_working_days, net_sales_target
    INTO target_days, target_sales
    FROM service_monthly_targets 
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) 
      AND month = EXTRACT(MONTH FROM CURRENT_DATE);
    
    -- Manual calculations
    IF input_days > 0 THEN
        manual_daily_avg := input_sales / input_days;
    ELSE
        manual_daily_avg := 0;
    END IF;
    
    manual_estimated := manual_daily_avg * target_days;
    
    RAISE NOTICE '=== MANUAL CALCULATION ===';
    RAISE NOTICE 'Working Days: %', input_days;
    RAISE NOTICE 'Current Sales: % AED', input_sales;
    RAISE NOTICE 'Target Working Days: %', target_days;
    RAISE NOTICE 'Target Sales: % AED', target_sales;
    RAISE NOTICE 'Manual Daily Average: % AED', manual_daily_avg;
    RAISE NOTICE 'Manual Estimated Total: % AED', manual_estimated;
    RAISE NOTICE '========================';
END $$; 