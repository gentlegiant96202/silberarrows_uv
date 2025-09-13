-- Debug Sales Calculations
-- Check why percentages are showing as dashes or zeros

-- 1. Check if we have sales targets
SELECT 
    'Sales Targets' as table_name,
    COUNT(*) as count,
    MIN(year) as min_year,
    MAX(year) as max_year
FROM sales_monthly_targets;

-- 2. Show all sales targets
SELECT 
    year,
    month,
    gross_profit_year_target,
    gross_profit_month_target,
    number_of_working_days
FROM sales_monthly_targets
ORDER BY year DESC, month DESC;

-- 3. Check current sales metrics data
SELECT 
    metric_date,
    year,
    month,
    
    -- Input values
    gross_sales_year_actual,
    cost_of_sales_year_actual,
    gross_sales_month_actual,
    cost_of_sales_month_actual,
    marketing_spend_month,
    
    -- Auto-calculated values
    gross_profit_year_actual,
    gross_profit_month_actual,
    
    -- Target values (should be populated by trigger)
    gross_profit_year_target,
    gross_profit_month_target,
    total_working_days,
    
    -- Percentage calculations
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    marketing_rate_against_gross_profit
    
FROM sales_daily_metrics
ORDER BY metric_date DESC;

-- 4. Test the trigger function manually for latest entry
SELECT 
    metric_date,
    calculate_sales_metrics_on_upsert()
FROM sales_daily_metrics
ORDER BY metric_date DESC
LIMIT 1;

-- 5. Check if trigger exists and is active
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'sales_metrics_calculation_trigger';

-- 6. Manual calculation test for specific date
DO $$
DECLARE
    test_date DATE := (SELECT MAX(metric_date) FROM sales_daily_metrics);
    metrics_rec RECORD;
    target_rec RECORD;
BEGIN
    -- Get metrics for latest date
    SELECT * INTO metrics_rec FROM sales_daily_metrics WHERE metric_date = test_date;
    
    -- Get target for that month
    SELECT * INTO target_rec FROM sales_monthly_targets 
    WHERE year = EXTRACT(YEAR FROM test_date) AND month = EXTRACT(MONTH FROM test_date);
    
    RAISE NOTICE 'Test Date: %', test_date;
    RAISE NOTICE 'Metrics found: %', CASE WHEN metrics_rec IS NOT NULL THEN 'YES' ELSE 'NO' END;
    RAISE NOTICE 'Target found: %', CASE WHEN target_rec IS NOT NULL THEN 'YES' ELSE 'NO' END;
    
    IF metrics_rec IS NOT NULL THEN
        RAISE NOTICE 'Gross Profit Year: %', metrics_rec.gross_profit_year_actual;
        RAISE NOTICE 'Gross Profit Month: %', metrics_rec.gross_profit_month_actual;
        RAISE NOTICE 'Marketing Spend: %', metrics_rec.marketing_spend_month;
    END IF;
    
    IF target_rec IS NOT NULL THEN
        RAISE NOTICE 'Year Target: %', target_rec.gross_profit_year_target;
        RAISE NOTICE 'Month Target: %', target_rec.gross_profit_month_target;
    END IF;
END $$; 