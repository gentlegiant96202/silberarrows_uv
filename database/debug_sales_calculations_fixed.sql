-- Debug Sales Calculations (Fixed)
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

-- 4. Check if trigger exists and is active
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'sales_metrics_calculation_trigger';

-- 5. Manual test: Check if targets exist for the dates we have metrics
SELECT 
    sm.metric_date,
    sm.year,
    sm.month,
    CASE WHEN st.id IS NOT NULL THEN 'TARGET EXISTS' ELSE 'NO TARGET' END as target_status,
    st.gross_profit_year_target,
    st.gross_profit_month_target
FROM sales_daily_metrics sm
LEFT JOIN sales_monthly_targets st ON sm.year = st.year AND sm.month = st.month
ORDER BY sm.metric_date DESC;

-- 6. Show what the manual calculation would be
SELECT 
    sm.metric_date,
    sm.gross_profit_year_actual,
    sm.gross_profit_month_actual,
    sm.marketing_spend_month,
    st.gross_profit_year_target,
    st.gross_profit_month_target,
    
    -- What the percentages should be
    CASE WHEN st.gross_profit_year_target > 0 
         THEN ROUND((sm.gross_profit_year_actual / st.gross_profit_year_target) * 100, 2)
         ELSE 0 
    END as calculated_year_achievement,
    
    CASE WHEN st.gross_profit_month_target > 0 
         THEN ROUND((sm.gross_profit_month_actual / st.gross_profit_month_target) * 100, 2)
         ELSE 0 
    END as calculated_month_achievement,
    
    CASE WHEN sm.gross_profit_month_actual > 0 
         THEN ROUND((sm.marketing_spend_month / sm.gross_profit_month_actual) * 100, 2)
         ELSE 0 
    END as calculated_marketing_rate
    
FROM sales_daily_metrics sm
LEFT JOIN sales_monthly_targets st ON sm.year = st.year AND sm.month = st.month
ORDER BY sm.metric_date DESC; 