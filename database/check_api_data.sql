-- Check what the API should be returning
-- This shows exactly what data should appear on the frontend

SELECT 
    metric_date,
    year,
    month,
    working_days_elapsed,
    
    -- Input fields
    gross_sales_year_actual,
    cost_of_sales_year_actual,
    gross_sales_month_actual,
    cost_of_sales_month_actual,
    marketing_spend_month,
    units_disposed_month,
    units_sold_stock_month,
    units_sold_consignment_month,
    
    -- Auto-calculated by database
    gross_profit_year_actual,
    gross_profit_month_actual,
    total_units_sold_month,
    
    -- Target fields (should be populated)
    gross_profit_year_target,
    gross_profit_month_target,
    total_working_days,
    
    -- Percentage fields (should be calculated)
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    average_gross_profit_per_car_month,
    marketing_rate_against_gross_profit,
    
    -- Metadata
    notes,
    created_at,
    updated_at
    
FROM sales_daily_metrics
ORDER BY metric_date DESC
LIMIT 5;

-- Also check the raw JSON that would be returned
SELECT row_to_json(sales_daily_metrics.*) as api_json
FROM sales_daily_metrics
ORDER BY metric_date DESC
LIMIT 1; 