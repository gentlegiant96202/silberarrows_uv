-- Fix Sales Calculations for Existing Data
-- Manually update the calculated fields that should be populated by trigger

-- First, let's create a target for the current month if it doesn't exist
INSERT INTO sales_monthly_targets (year, month, gross_profit_year_target, gross_profit_month_target, number_of_working_days)
SELECT 
    EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
    EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
    12000000.00,  -- Example year target
    1000000.00,   -- Example month target  
    22            -- Example working days
WHERE NOT EXISTS (
    SELECT 1 FROM sales_monthly_targets 
    WHERE year = EXTRACT(YEAR FROM CURRENT_DATE) 
    AND month = EXTRACT(MONTH FROM CURRENT_DATE)
);

-- Update existing sales metrics with proper calculations
UPDATE sales_daily_metrics 
SET 
    -- Get target values
    gross_profit_year_target = targets.gross_profit_year_target,
    gross_profit_month_target = targets.gross_profit_month_target,
    total_working_days = targets.number_of_working_days,
    
    -- Calculate achievement percentages
    gross_profit_year_achieved_percentage = 
        CASE WHEN targets.gross_profit_year_target > 0 
             THEN (sales_daily_metrics.gross_profit_year_actual / targets.gross_profit_year_target) * 100
             ELSE 0 
        END,
        
    gross_profit_month_achieved_percentage = 
        CASE WHEN targets.gross_profit_month_target > 0 
             THEN (sales_daily_metrics.gross_profit_month_actual / targets.gross_profit_month_target) * 100
             ELSE 0 
        END,
    
    -- Calculate average gross profit per car
    average_gross_profit_per_car_month = 
        CASE WHEN sales_daily_metrics.total_units_sold_month > 0 
             THEN sales_daily_metrics.gross_profit_month_actual / sales_daily_metrics.total_units_sold_month
             ELSE 0 
        END,
    
    -- Calculate marketing rate against gross profit
    marketing_rate_against_gross_profit = 
        CASE WHEN sales_daily_metrics.gross_profit_month_actual > 0 
             THEN (sales_daily_metrics.marketing_spend_month / sales_daily_metrics.gross_profit_month_actual) * 100
             ELSE 0 
        END,
        
    updated_at = NOW()
    
FROM sales_monthly_targets targets
WHERE targets.year = sales_daily_metrics.year 
AND targets.month = sales_daily_metrics.month;

-- Show updated results
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_actual,
    gross_profit_month_target,
    gross_profit_month_achieved_percentage,
    marketing_spend_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics
ORDER BY metric_date DESC;

SELECT 'Sales calculations updated successfully!' as status; 