-- =====================================================
-- Check What Historical Data We Have
-- =====================================================

-- STEP 1: See all months and how many days of data each has
SELECT 
    EXTRACT(YEAR FROM metric_date) as year,
    EXTRACT(MONTH FROM metric_date) as month,
    TO_CHAR(MIN(metric_date), 'Mon YYYY') as month_name,
    COUNT(*) as days_recorded,
    MAX(working_days_elapsed) as max_working_days,
    MAX(current_net_sales) as final_sales,
    MAX(metric_date) as last_date
FROM daily_service_metrics
GROUP BY EXTRACT(YEAR FROM metric_date), EXTRACT(MONTH FROM metric_date)
ORDER BY year DESC, month DESC;

-- STEP 2: For October 2025 specifically, show daily progression
SELECT 
    metric_date,
    working_days_elapsed,
    current_net_sales,
    current_net_sales - LAG(current_net_sales, 1, 0) OVER (ORDER BY metric_date) as daily_increment
FROM daily_service_metrics
WHERE EXTRACT(YEAR FROM metric_date) = 2025 
  AND EXTRACT(MONTH FROM metric_date) = 10
ORDER BY metric_date;

-- STEP 3: Simple analysis - if we ONLY have October data
WITH october_data AS (
    SELECT 
        metric_date,
        working_days_elapsed,
        current_net_sales,
        current_net_sales - LAG(current_net_sales, 1, 0) OVER (ORDER BY metric_date) as daily_sales
    FROM daily_service_metrics
    WHERE EXTRACT(YEAR FROM metric_date) = 2025 
      AND EXTRACT(MONTH FROM metric_date) = 10
)
SELECT 
    'October 2025 Current Pattern' as analysis,
    ROUND(AVG(daily_sales), 0) as avg_daily_sales,
    MAX(daily_sales) as best_day,
    MIN(CASE WHEN daily_sales > 0 THEN daily_sales END) as worst_day,
    ROUND(STDDEV(daily_sales), 0) as std_deviation,
    MAX(working_days_elapsed) as days_so_far,
    MAX(current_net_sales) as total_so_far
FROM october_data
WHERE daily_sales IS NOT NULL AND daily_sales > 0;

SELECT '
📊 RESULTS INTERPRETATION:
- If you only have October 2025 data, we cannot use historical pattern
- Alternative: Use industry benchmarks or manual % input
- Typical service industry end-of-month surge: 20-30% in last 2 days
- Recommendation: Track for 2-3 months then enable pattern forecasting
' as next_steps;

