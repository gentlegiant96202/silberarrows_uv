-- Debug why trigger is setting everything to 0.00

-- 1. Check the actual data in sales_daily_metrics
SELECT 
    metric_date,
    year,
    month,
    gross_profit_year_actual,
    gross_profit_month_actual,
    marketing_spend_month,
    units_sold_stock_month,
    units_sold_consignment_month,
    total_units_sold_month,
    gross_profit_year_target,
    gross_profit_month_target
FROM sales_daily_metrics 
WHERE metric_date >= '2025-08-06'
ORDER BY metric_date DESC;

-- 2. Check if targets exist for August 2025
SELECT 
    year,
    month,
    gross_profit_year_target,
    gross_profit_month_target,
    number_of_working_days
FROM sales_monthly_targets
WHERE year = 2025 AND month = 8;

-- 3. Manual calculation test for debugging
SELECT 
    metric_date,
    gross_profit_year_actual,
    gross_profit_year_target,
    -- Manual year percentage calculation
    CASE 
        WHEN gross_profit_year_target > 0 AND gross_profit_year_actual IS NOT NULL
        THEN ROUND((gross_profit_year_actual / gross_profit_year_target * 100), 2)
        ELSE 0 
    END as manual_year_percentage,
    
    gross_profit_month_actual,
    gross_profit_month_target,
    -- Manual month percentage calculation
    CASE 
        WHEN gross_profit_month_target > 0 AND gross_profit_month_actual IS NOT NULL
        THEN ROUND((gross_profit_month_actual / gross_profit_month_target * 100), 2)
        ELSE 0 
    END as manual_month_percentage,
    
    total_units_sold_month,
    -- Manual profit per car calculation
    CASE 
        WHEN total_units_sold_month > 0 AND gross_profit_month_actual IS NOT NULL
        THEN ROUND((gross_profit_month_actual / total_units_sold_month), 2)
        ELSE 0 
    END as manual_profit_per_car
    
FROM sales_daily_metrics 
WHERE metric_date >= '2025-08-06'
ORDER BY metric_date DESC;

-- 4. Fix the values manually first
UPDATE sales_daily_metrics 
SET 
    gross_profit_year_achieved_percentage = 
        CASE 
            WHEN gross_profit_year_target > 0 AND gross_profit_year_actual IS NOT NULL
            THEN ROUND((gross_profit_year_actual / gross_profit_year_target * 100), 2)
            ELSE 0 
        END,
    gross_profit_month_achieved_percentage = 
        CASE 
            WHEN gross_profit_month_target > 0 AND gross_profit_month_actual IS NOT NULL
            THEN ROUND((gross_profit_month_actual / gross_profit_month_target * 100), 2)
            ELSE 0 
        END,
    average_gross_profit_per_car_month = 
        CASE 
            WHEN total_units_sold_month > 0 AND gross_profit_month_actual IS NOT NULL
            THEN ROUND((gross_profit_month_actual / total_units_sold_month), 2)
            ELSE 0 
        END,
    marketing_rate_against_gross_profit = 
        CASE 
            WHEN gross_profit_month_actual > 0 AND marketing_spend_month IS NOT NULL
            THEN ROUND((marketing_spend_month / gross_profit_month_actual * 100), 2)
            ELSE 0 
        END
WHERE metric_date >= '2025-08-06';

-- 5. Check the results after manual fix
SELECT 
    metric_date,
    gross_profit_year_achieved_percentage,
    gross_profit_month_achieved_percentage,
    average_gross_profit_per_car_month,
    marketing_rate_against_gross_profit
FROM sales_daily_metrics 
WHERE metric_date >= '2025-08-06'
ORDER BY metric_date DESC; 