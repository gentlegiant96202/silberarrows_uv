-- Fix the estimated calculation for the last day of the month
-- For daily_service_metrics table (simplified schema)

CREATE OR REPLACE FUNCTION calculate_and_update_metrics(target_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
    input_rec RECORD;
    working_days_in_month INTEGER;
    days_remaining INTEGER;
    
    -- Calculated values
    net_sales_percentage DECIMAL;
    labour_sales_percentage DECIMAL;
    remaining_net DECIMAL;
    remaining_labour DECIMAL;
    daily_avg DECIMAL;
    estimated_net DECIMAL;
    estimated_net_percentage DECIMAL;
    estimated_labour DECIMAL;
    estimated_labour_percentage DECIMAL;
    daily_avg_needed DECIMAL;
BEGIN
    -- Get monthly targets
    SELECT * INTO target_rec 
    FROM service_monthly_targets 
    WHERE year = EXTRACT(YEAR FROM target_date) 
    AND month = EXTRACT(MONTH FROM target_date);
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No targets found for % %', EXTRACT(YEAR FROM target_date), EXTRACT(MONTH FROM target_date);
        RETURN FALSE;
    END IF;
    
    -- Get current input metrics
    SELECT * INTO input_rec 
    FROM daily_service_metrics 
    WHERE metric_date = target_date;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No input data found for %', target_date;
        RETURN FALSE;
    END IF;
    
    -- Calculate derived metrics
    working_days_in_month := target_rec.number_of_working_days;
    days_remaining := GREATEST(0, working_days_in_month - COALESCE(input_rec.working_days_elapsed, 0));
    
    -- Percentages
    net_sales_percentage := CASE 
        WHEN target_rec.net_sales_target > 0 
        THEN (COALESCE(input_rec.current_net_sales, 0) / target_rec.net_sales_target) * 100 
        ELSE 0 
    END;
    
    labour_sales_percentage := CASE 
        WHEN target_rec.labour_sales_target > 0 
        THEN (COALESCE(input_rec.current_net_labor_sales, 0) / target_rec.labour_sales_target) * 100 
        ELSE 0 
    END;
    
    -- Remaining amounts
    remaining_net := GREATEST(0, target_rec.net_sales_target - COALESCE(input_rec.current_net_sales, 0));
    remaining_labour := GREATEST(0, target_rec.labour_sales_target - COALESCE(input_rec.current_net_labor_sales, 0));
    
    -- Daily averages
    daily_avg := CASE 
        WHEN COALESCE(input_rec.working_days_elapsed, 0) > 0 
        THEN COALESCE(input_rec.current_net_sales, 0) / input_rec.working_days_elapsed 
        ELSE 0 
    END;
    
    -- FIX: Estimations - On last day or beyond, use actual sales (no projection)
    estimated_net := CASE 
        WHEN COALESCE(input_rec.working_days_elapsed, 0) >= working_days_in_month
        THEN COALESCE(input_rec.current_net_sales, 0)  -- Use actual sales on last day
        WHEN COALESCE(input_rec.working_days_elapsed, 0) > 0 
        THEN (COALESCE(input_rec.current_net_sales, 0) / input_rec.working_days_elapsed) * working_days_in_month 
        ELSE 0 
    END;
    
    estimated_net_percentage := CASE 
        WHEN target_rec.net_sales_target > 0 
        THEN (estimated_net / target_rec.net_sales_target) * 100 
        ELSE 0 
    END;
    
    -- FIX: Apply same logic to estimated labour
    estimated_labour := CASE 
        WHEN COALESCE(input_rec.working_days_elapsed, 0) >= working_days_in_month
        THEN COALESCE(input_rec.current_net_labor_sales, 0)  -- Use actual labour sales on last day
        WHEN COALESCE(input_rec.working_days_elapsed, 0) > 0 
        THEN (COALESCE(input_rec.current_net_labor_sales, 0) / input_rec.working_days_elapsed) * working_days_in_month 
        ELSE 0 
    END;
    
    estimated_labour_percentage := CASE 
        WHEN target_rec.labour_sales_target > 0 
        THEN (estimated_labour / target_rec.labour_sales_target) * 100 
        ELSE 0 
    END;
    
    -- Daily average needed
    daily_avg_needed := CASE 
        WHEN days_remaining > 0 
        THEN remaining_net / days_remaining 
        ELSE 0 
    END;
    
    -- Update the record with calculated values
    UPDATE daily_service_metrics 
    SET 
        current_net_sales_percentage = net_sales_percentage,
        current_labour_sales_percentage = labour_sales_percentage,
        remaining_net_sales = remaining_net,
        remaining_labour_sales = remaining_labour,
        current_daily_average = daily_avg,
        estimated_net_sales = estimated_net,
        estimated_net_sales_percentage = estimated_net_percentage,
        estimated_labor_sales = estimated_labour,
        estimated_labor_percentage = estimated_labour_percentage,
        daily_average_needed = daily_avg_needed,
        updated_at = NOW()
    WHERE metric_date = target_date;
    
    RAISE NOTICE 'Updated calculated metrics for %', target_date;
    RETURN TRUE;
END;
$$;

-- Recalculate all existing metrics
DO $$
DECLARE
    metric_record RECORD;
    success_count INTEGER := 0;
    error_count INTEGER := 0;
BEGIN
    FOR metric_record IN 
        SELECT DISTINCT metric_date 
        FROM daily_service_metrics 
        ORDER BY metric_date
    LOOP
        BEGIN
            IF calculate_and_update_metrics(metric_record.metric_date) THEN
                success_count := success_count + 1;
            ELSE
                error_count := error_count + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error recalculating metrics for %: %', metric_record.metric_date, SQLERRM;
            error_count := error_count + 1;
        END;
    END LOOP;
    
    RAISE NOTICE 'Recalculation complete: % successful, % errors', success_count, error_count;
END $$;

SELECT 'Estimated calculation fixed for last day - all metrics recalculated!' as status;

