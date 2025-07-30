-- Simple Calculation Fix for Service Department Metrics
-- This fixes the 100x error with proper PostgreSQL syntax

CREATE OR REPLACE FUNCTION calculate_and_store_service_metrics(target_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
    calc_year INTEGER;
    calc_month INTEGER;
    
    working_days DECIMAL := 0;
    net_sales DECIMAL := 0;
    labor_sales DECIMAL := 0;
    
    net_sales_pct DECIMAL := 0;
    labour_sales_pct DECIMAL := 0;
    remaining_net DECIMAL := 0;
    remaining_labour DECIMAL := 0;
    daily_avg DECIMAL := 0;
    estimated_net DECIMAL := 0;
    estimated_net_pct DECIMAL := 0;
    estimated_labour DECIMAL := 0;
    estimated_labour_pct DECIMAL := 0;
    daily_needed DECIMAL := 0;
    remaining_days INTEGER := 0;
    labour_ratio DECIMAL := 0;
    
BEGIN
    calc_year := EXTRACT(YEAR FROM target_date);
    calc_month := EXTRACT(MONTH FROM target_date);
    
    -- Get target data
    SELECT * INTO target_rec
    FROM service_monthly_targets
    WHERE year = calc_year AND month = calc_month;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No target data found for year %, month %', calc_year, calc_month;
        RETURN FALSE;
    END IF;
    
    -- Get input values
    SELECT COALESCE(metric_value, 0) INTO working_days 
    FROM service_metrics 
    WHERE metric_date = target_date AND metric_name = 'working_days_elapsed';
    
    SELECT COALESCE(metric_value, 0) INTO net_sales 
    FROM service_metrics 
    WHERE metric_date = target_date AND metric_name = 'current_net_sales';
    
    SELECT COALESCE(metric_value, 0) INTO labor_sales 
    FROM service_metrics 
    WHERE metric_date = target_date AND metric_name = 'current_net_labor_sales';
    
    -- Ensure working_days is at least 1
    IF working_days <= 0 THEN
        working_days := 1;
    END IF;
    
    -- Calculate metrics
    IF target_rec.net_sales_target > 0 THEN
        net_sales_pct := (net_sales / target_rec.net_sales_target) * 100;
    END IF;
    
    IF target_rec.labour_sales_target > 0 THEN
        labour_sales_pct := (labor_sales / target_rec.labour_sales_target) * 100;
    END IF;
    
    remaining_net := GREATEST(target_rec.net_sales_target - net_sales, 0);
    remaining_labour := GREATEST(target_rec.labour_sales_target - labor_sales, 0);
    
    daily_avg := net_sales / working_days;
    estimated_net := daily_avg * target_rec.number_of_working_days;
    
    IF target_rec.net_sales_target > 0 THEN
        estimated_net_pct := (estimated_net / target_rec.net_sales_target) * 100;
    END IF;
    
    IF net_sales > 0 THEN
        labour_ratio := labor_sales / net_sales;
    END IF;
    
    estimated_labour := estimated_net * labour_ratio;
    
    IF target_rec.labour_sales_target > 0 THEN
        estimated_labour_pct := (estimated_labour / target_rec.labour_sales_target) * 100;
    END IF;
    
    remaining_days := target_rec.number_of_working_days - working_days;
    IF remaining_days > 0 THEN
        daily_needed := remaining_net / remaining_days;
    END IF;
    
    -- Debug output
    RAISE NOTICE 'Calculation for %: Working Days %, Net Sales %, Daily Avg %, Estimated %', 
        target_date, working_days, net_sales, daily_avg, estimated_net;
    
    -- Store calculated metrics
    INSERT INTO service_metrics (metric_date, metric_name, metric_value, metric_type, metric_category, unit) VALUES
    (target_date, 'current_net_sales_percentage', net_sales_pct, 'percentage', 'calculated', '%'),
    (target_date, 'current_labour_sales_percentage', labour_sales_pct, 'percentage', 'calculated', '%'),
    (target_date, 'remaining_net_sales', remaining_net, 'currency', 'calculated', 'AED'),
    (target_date, 'remaining_labour_sales', remaining_labour, 'currency', 'calculated', 'AED'),
    (target_date, 'current_daily_average', daily_avg, 'currency', 'calculated', 'AED'),
    (target_date, 'estimated_net_sales', estimated_net, 'currency', 'calculated', 'AED'),
    (target_date, 'estimated_net_sales_percentage', estimated_net_pct, 'percentage', 'calculated', '%'),
    (target_date, 'estimated_labor_sales', estimated_labour, 'currency', 'calculated', 'AED'),
    (target_date, 'estimated_labor_sales_percentage', estimated_labour_pct, 'percentage', 'calculated', '%'),
    (target_date, 'daily_average_needed', daily_needed, 'currency', 'calculated', 'AED')
    
    ON CONFLICT (metric_date, metric_name) 
    DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        updated_at = NOW();
    
    RETURN TRUE;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in calculation: %', SQLERRM;
    RETURN FALSE;
END $$;

-- Test the function
SELECT calculate_and_store_service_metrics(CURRENT_DATE); 