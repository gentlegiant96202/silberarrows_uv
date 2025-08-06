-- Fix average profit per car calculation

-- 1. Check current data for units sold
SELECT 
    metric_date,
    units_sold_stock_month,
    units_sold_consignment_month,
    total_units_sold_month,
    gross_profit_month_actual,
    average_gross_profit_per_car_month,
    -- Manual calculation
    CASE 
        WHEN (units_sold_stock_month + units_sold_consignment_month) > 0 
        THEN ROUND(gross_profit_month_actual / (units_sold_stock_month + units_sold_consignment_month), 2)
        ELSE 0 
    END as manual_avg_calculation
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06';

-- 2. Update the average profit per car manually
UPDATE sales_daily_metrics 
SET average_gross_profit_per_car_month = 
    CASE 
        WHEN (units_sold_stock_month + units_sold_consignment_month) > 0 
        THEN ROUND(gross_profit_month_actual / (units_sold_stock_month + units_sold_consignment_month), 2)
        ELSE 0 
    END
WHERE metric_date = '2025-08-06';

-- 3. Check the result
SELECT 
    metric_date,
    units_sold_stock_month,
    units_sold_consignment_month,
    total_units_sold_month,
    gross_profit_month_actual,
    average_gross_profit_per_car_month
FROM sales_daily_metrics 
WHERE metric_date = '2025-08-06';

-- 4. If units sold are 0, let's add some sample data to test
-- (Only run this if units are 0 and you want to test)
/*
UPDATE sales_daily_metrics 
SET 
    units_sold_stock_month = 5,
    units_sold_consignment_month = 3,
    total_units_sold_month = 8,
    average_gross_profit_per_car_month = ROUND(19701.00 / 8, 2)
WHERE metric_date = '2025-08-06';
*/ 