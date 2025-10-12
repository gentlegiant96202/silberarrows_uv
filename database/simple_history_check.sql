-- =====================================================
-- Simple Check - What data do we actually have?
-- =====================================================

-- See ALL months, no filters
SELECT 
    EXTRACT(YEAR FROM metric_date) as year,
    EXTRACT(MONTH FROM metric_date) as month,
    TO_CHAR(MIN(metric_date), 'Month YYYY') as month_name,
    COUNT(*) as num_records,
    MIN(metric_date) as first_date,
    MAX(metric_date) as last_date,
    MIN(current_net_sales) as first_sales,
    MAX(current_net_sales) as last_sales,
    MAX(working_days_elapsed) as working_days
FROM daily_service_metrics
GROUP BY EXTRACT(YEAR FROM metric_date), EXTRACT(MONTH FROM metric_date)
ORDER BY year, month;

-- For each complete month, show last few days pattern
SELECT 
    TO_CHAR(metric_date, 'Mon DD') as date,
    working_days_elapsed as day_num,
    current_net_sales as cumulative_sales,
    current_net_sales - LAG(current_net_sales) OVER (PARTITION BY EXTRACT(YEAR FROM metric_date), EXTRACT(MONTH FROM metric_date) ORDER BY metric_date) as daily_sales
FROM daily_service_metrics
WHERE working_days_elapsed >= 18  -- Last few days of each month
ORDER BY metric_date;

