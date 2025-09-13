-- Force Update Sales Calculations
-- Manually update the actual columns with the calculated values

-- Update the sales_daily_metrics table with the proper calculated values
UPDATE sales_daily_metrics 
SET 
    -- Copy target values from the targets table
    gross_profit_year_target = targets.gross_profit_year_target,
    gross_profit_month_target = targets.gross_profit_month_target,
    total_working_days = targets.number_of_working_days,
    
    -- Calculate achievement percentages
    gross_profit_year_achieved_percentage = 
        CASE WHEN targets.gross_profit_year_target > 0 
             THEN ROUND((sales_daily_metrics.gross_profit_year_actual / targets.gross_profit_year_target) * 100, 2)
             ELSE 0 
        END,
        
    gross_profit_month_achieved_percentage = 
        CASE WHEN targets.gross_profit_month_target > 0 
             THEN ROUND((sales_daily_metrics.gross_profit_month_actual / targets.gross_profit_month_target) * 100, 2)
             ELSE 0 
        END,
    
    -- Calculate average gross profit per car
    average_gross_profit_per_car_month = 
        CASE WHEN sales_daily_metrics.total_units_sold_month > 0 
             THEN ROUND(sales_daily_metrics.gross_profit_month_actual / sales_daily_metrics.total_units_sold_month, 2)
             ELSE 0 
        END,
    
    -- Calculate marketing rate against gross profit
    marketing_rate_against_gross_profit = 
        CASE WHEN sales_daily_metrics.gross_profit_month_actual > 0 
             THEN ROUND((sales_daily_metrics.marketing_spend_month / sales_daily_metrics.gross_profit_month_actual) * 100, 2)
             ELSE 0 
        END,
        
    updated_at = NOW()
    
FROM sales_monthly_targets targets
WHERE targets.year = sales_daily_metrics.year 
AND targets.month = sales_daily_metrics.month;

-- Verify the update worked
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    gross_profit_year_achieved_percentage,
    gross_profit_month_actual,
    gross_profit_month_target,
    gross_profit_month_achieved_percentage,
    marketing_spend_month,
    marketing_rate_against_gross_profit,
    total_units_sold_month,
    average_gross_profit_per_car_month
FROM sales_daily_metrics
ORDER BY metric_date DESC;

-- Check if trigger exists and recreate it if needed
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;

CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_on_upsert();

SELECT 'Sales calculations updated and trigger recreated!' as status; 