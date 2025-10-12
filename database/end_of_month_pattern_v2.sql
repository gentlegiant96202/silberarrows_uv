-- =====================================================
-- End-of-Month Pattern Analysis V2 (Fixed)
-- Works with all available data
-- =====================================================

-- Get all months and their final day
WITH monthly_final_days AS (
    SELECT 
        EXTRACT(YEAR FROM metric_date) as year,
        EXTRACT(MONTH FROM metric_date) as month,
        MAX(working_days_elapsed) as total_working_days,
        MAX(current_net_sales) as month_final_total
    FROM daily_service_metrics
    GROUP BY EXTRACT(YEAR FROM metric_date), EXTRACT(MONTH FROM metric_date)
),
daily_with_days_remaining AS (
    SELECT 
        dm.metric_date,
        EXTRACT(YEAR FROM dm.metric_date) as year,
        EXTRACT(MONTH FROM dm.metric_date) as month,
        dm.working_days_elapsed,
        dm.current_net_sales,
        mf.total_working_days,
        mf.month_final_total,
        mf.total_working_days - dm.working_days_elapsed as days_remaining
    FROM daily_service_metrics dm
    JOIN monthly_final_days mf ON 
        EXTRACT(YEAR FROM dm.metric_date) = mf.year AND
        EXTRACT(MONTH FROM dm.metric_date) = mf.month
)
SELECT 
    TO_CHAR(MIN(metric_date), 'Mon YYYY') as month_name,
    year,
    month,
    total_working_days,
    month_final_total as final_revenue,
    
    -- Sales 2 days before end
    MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END) as sales_at_day_minus_2,
    
    -- Sales 5 days before end  
    MAX(CASE WHEN days_remaining = 5 THEN current_net_sales END) as sales_at_day_minus_5,
    
    -- Calculate % that came in LAST 2 days
    CASE 
        WHEN MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END) IS NOT NULL 
        THEN ROUND(
            ((month_final_total - MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END)) 
            / month_final_total * 100)::numeric, 
            1
        )
        ELSE NULL 
    END as pct_in_last_2_days,
    
    -- Calculate % that came in LAST 5 days
    CASE 
        WHEN MAX(CASE WHEN days_remaining = 5 THEN current_net_sales END) IS NOT NULL 
        THEN ROUND(
            ((month_final_total - MAX(CASE WHEN days_remaining = 5 THEN current_net_sales END)) 
            / month_final_total * 100)::numeric, 
            1
        )
        ELSE NULL 
    END as pct_in_last_5_days,
    
    -- Amount in last 2 days
    CASE 
        WHEN MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END) IS NOT NULL 
        THEN month_final_total - MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END)
        ELSE NULL 
    END as amount_in_last_2_days

FROM daily_with_days_remaining
GROUP BY year, month, total_working_days, month_final_total
HAVING total_working_days >= 20  -- Only complete months
ORDER BY year DESC, month DESC;

-- Calculate the AVERAGE pattern
SELECT 
    '🎯 AVERAGE END-OF-MONTH PATTERN' as summary,
    ROUND(AVG(pct_in_last_2_days), 1) as avg_pct_last_2_days,
    ROUND(AVG(pct_in_last_5_days), 1) as avg_pct_last_5_days,
    ROUND(AVG(amount_in_last_2_days), 0) as avg_amount_last_2_days,
    COUNT(*) as months_analyzed,
    STRING_AGG(DISTINCT TO_CHAR(MIN(metric_date), 'Mon YY'), ', ' ORDER BY TO_CHAR(MIN(metric_date), 'Mon YY')) as months_included
FROM (
    -- Same query as above wrapped
    WITH monthly_final_days AS (
        SELECT 
            EXTRACT(YEAR FROM metric_date) as year,
            EXTRACT(MONTH FROM metric_date) as month,
            MAX(working_days_elapsed) as total_working_days,
            MAX(current_net_sales) as month_final_total
        FROM daily_service_metrics
        GROUP BY EXTRACT(YEAR FROM metric_date), EXTRACT(MONTH FROM metric_date)
    ),
    daily_with_days_remaining AS (
        SELECT 
            dm.metric_date,
            EXTRACT(YEAR FROM dm.metric_date) as year,
            EXTRACT(MONTH FROM dm.metric_date) as month,
            dm.current_net_sales,
            mf.total_working_days,
            mf.month_final_total,
            mf.total_working_days - dm.working_days_elapsed as days_remaining
        FROM daily_service_metrics dm
        JOIN monthly_final_days mf ON 
            EXTRACT(YEAR FROM dm.metric_date) = mf.year AND
            EXTRACT(MONTH FROM dm.metric_date) = mf.month
    )
    SELECT 
        metric_date,
        month_final_total,
        CASE 
            WHEN MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END) OVER (PARTITION BY year, month) IS NOT NULL 
            THEN ROUND(
                ((month_final_total - MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END) OVER (PARTITION BY year, month)) 
                / month_final_total * 100)::numeric, 
                1
            )
            ELSE NULL 
        END as pct_in_last_2_days,
        CASE 
            WHEN MAX(CASE WHEN days_remaining = 5 THEN current_net_sales END) OVER (PARTITION BY year, month) IS NOT NULL 
            THEN ROUND(
                ((month_final_total - MAX(CASE WHEN days_remaining = 5 THEN current_net_sales END) OVER (PARTITION BY year, month)) 
                / month_final_total * 100)::numeric, 
                1
            )
            ELSE NULL 
        END as pct_in_last_5_days,
        CASE 
            WHEN MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END) OVER (PARTITION BY year, month) IS NOT NULL 
            THEN month_final_total - MAX(CASE WHEN days_remaining = 2 THEN current_net_sales END) OVER (PARTITION BY year, month)
            ELSE NULL 
        END as amount_in_last_2_days,
        total_working_days
    FROM daily_with_days_remaining
    WHERE total_working_days >= 20
) patterns
WHERE pct_in_last_2_days IS NOT NULL
GROUP BY ();

SELECT '
✅ NOW USE THESE NUMBERS:
Copy the avg_pct_last_2_days and avg_pct_last_5_days values.
I will hardcode them into the smart forecast algorithm!

Example: If it shows 22.5% in last 2 days, that means your team 
typically invoices 22.5% of the months total in the final 2 days.
' as next_action;

