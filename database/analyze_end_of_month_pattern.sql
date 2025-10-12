-- =====================================================
-- Analyze End-of-Month Revenue Pattern
-- Find out how much revenue comes in the last days
-- =====================================================

-- STEP 1: For each completed month, calculate what % came in last 2, 5, 7 days
WITH monthly_totals AS (
    SELECT 
        EXTRACT(YEAR FROM metric_date) as year,
        EXTRACT(MONTH FROM metric_date) as month,
        MAX(current_net_sales) as month_total,
        MAX(working_days_elapsed) as total_days
    FROM daily_service_metrics
    GROUP BY EXTRACT(YEAR FROM metric_date), EXTRACT(MONTH FROM metric_date)
    HAVING MAX(working_days_elapsed) >= 20 -- Only complete/near-complete months
),
daily_progress AS (
    SELECT 
        dm.metric_date,
        EXTRACT(YEAR FROM dm.metric_date) as year,
        EXTRACT(MONTH FROM dm.metric_date) as month,
        dm.working_days_elapsed,
        dm.current_net_sales,
        mt.month_total,
        mt.total_days,
        -- Calculate how many days from end
        mt.total_days - dm.working_days_elapsed as days_from_end
    FROM daily_service_metrics dm
    JOIN monthly_totals mt ON 
        EXTRACT(YEAR FROM dm.metric_date) = mt.year AND 
        EXTRACT(MONTH FROM dm.metric_date) = mt.month
)
SELECT 
    year,
    month,
    month_total,
    total_days,
    
    -- Revenue at day -2 from end (2 days before month end)
    MAX(CASE WHEN days_from_end = 2 THEN current_net_sales ELSE NULL END) as sales_2days_before_end,
    
    -- Revenue at day -5 from end
    MAX(CASE WHEN days_from_end = 5 THEN current_net_sales ELSE NULL END) as sales_5days_before_end,
    
    -- Calculate what % came in LAST 2 days
    ROUND((
        (month_total - MAX(CASE WHEN days_from_end = 2 THEN current_net_sales ELSE NULL END)) 
        / NULLIF(month_total, 0) * 100
    )::numeric, 1) as pct_last_2_days,
    
    -- Calculate what % came in LAST 5 days
    ROUND((
        (month_total - MAX(CASE WHEN days_from_end = 5 THEN current_net_sales ELSE NULL END)) 
        / NULLIF(month_total, 0) * 100
    )::numeric, 1) as pct_last_5_days,
    
    -- Average daily for first 20 days vs last days
    ROUND((
        MAX(CASE WHEN working_days_elapsed = 20 THEN current_net_sales ELSE NULL END) / 20.0
    )::numeric, 0) as avg_daily_first_20_days,
    
    ROUND((
        (month_total - MAX(CASE WHEN working_days_elapsed = 20 THEN current_net_sales ELSE NULL END)) 
        / NULLIF((total_days - 20), 0)
    )::numeric, 0) as avg_daily_last_days

FROM daily_progress
GROUP BY year, month, month_total, total_days
ORDER BY year DESC, month DESC;

-- STEP 2: Calculate AVERAGE pattern across all months
SELECT 
    'Historical Average Pattern' as analysis,
    ROUND(AVG(pct_last_2_days), 1) as avg_pct_last_2_days,
    ROUND(AVG(pct_last_5_days), 1) as avg_pct_last_5_days,
    COUNT(*) as months_analyzed
FROM (
    -- Reuse the query above but wrapped
    WITH monthly_totals AS (
        SELECT 
            EXTRACT(YEAR FROM metric_date) as year,
            EXTRACT(MONTH FROM metric_date) as month,
            MAX(current_net_sales) as month_total,
            MAX(working_days_elapsed) as total_days
        FROM daily_service_metrics
        GROUP BY EXTRACT(YEAR FROM metric_date), EXTRACT(MONTH FROM metric_date)
        HAVING MAX(working_days_elapsed) >= 20
    ),
    daily_progress AS (
        SELECT 
            EXTRACT(YEAR FROM dm.metric_date) as year,
            EXTRACT(MONTH FROM dm.metric_date) as month,
            dm.working_days_elapsed,
            dm.current_net_sales,
            mt.month_total,
            mt.total_days,
            mt.total_days - dm.working_days_elapsed as days_from_end
        FROM daily_service_metrics dm
        JOIN monthly_totals mt ON 
            EXTRACT(YEAR FROM dm.metric_date) = mt.year AND 
            EXTRACT(MONTH FROM dm.metric_date) = mt.month
    )
    SELECT 
        ROUND((
            (month_total - MAX(CASE WHEN days_from_end = 2 THEN current_net_sales ELSE NULL END)) 
            / NULLIF(month_total, 0) * 100
        )::numeric, 1) as pct_last_2_days,
        ROUND((
            (month_total - MAX(CASE WHEN days_from_end = 5 THEN current_net_sales ELSE NULL END)) 
            / NULLIF(month_total, 0) * 100
        )::numeric, 1) as pct_last_5_days
    FROM daily_progress
    GROUP BY year, month, month_total, total_days
) patterns;

SELECT '
INTERPRETATION:
- If avg_pct_last_2_days = 15%, it means 15% of months revenue typically comes in final 2 days
- If avg_pct_last_5_days = 30%, then 30% comes in final 5 days
- This shows the "hockey stick" pattern intensity
- Use this to adjust forecasts for current month
' as instructions;

