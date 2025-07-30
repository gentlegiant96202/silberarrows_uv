-- Simplified Service Department Tracking Schema
-- One row per date with all metrics as columns

-- 1. Drop existing normalized table if it exists
DROP TABLE IF EXISTS service_metrics CASCADE;

-- 2. Create simplified daily metrics table
CREATE TABLE IF NOT EXISTS daily_service_metrics (
    -- Primary key
    metric_date DATE PRIMARY KEY,
    
    -- Input metrics (manually entered)
    working_days_elapsed INTEGER DEFAULT 0,
    current_net_sales DECIMAL(15,2) DEFAULT 0,
    current_net_labor_sales DECIMAL(15,2) DEFAULT 0,
    number_of_invoices INTEGER DEFAULT 0,
    current_marketing_spend DECIMAL(15,2) DEFAULT 0,
    
    -- Calculated metrics (auto-computed)
    current_net_sales_percentage DECIMAL(5,2) DEFAULT 0,
    current_labour_sales_percentage DECIMAL(5,2) DEFAULT 0,
    remaining_net_sales DECIMAL(15,2) DEFAULT 0,
    remaining_labour_sales DECIMAL(15,2) DEFAULT 0,
    current_daily_average DECIMAL(15,2) DEFAULT 0,
    estimated_net_sales DECIMAL(15,2) DEFAULT 0,
    estimated_net_sales_percentage DECIMAL(5,2) DEFAULT 0,
    estimated_labor_sales DECIMAL(15,2) DEFAULT 0,
    estimated_labor_percentage DECIMAL(5,2) DEFAULT 0,
    daily_average_needed DECIMAL(15,2) DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Keep monthly targets table as is (it's already simple)
-- service_monthly_targets table remains unchanged

-- 4. Create function to calculate and update metrics
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
    
    -- Estimations
    estimated_net := CASE 
        WHEN COALESCE(input_rec.working_days_elapsed, 0) > 0 
        THEN (COALESCE(input_rec.current_net_sales, 0) / input_rec.working_days_elapsed) * working_days_in_month 
        ELSE 0 
    END;
    
    estimated_net_percentage := CASE 
        WHEN target_rec.net_sales_target > 0 
        THEN (estimated_net / target_rec.net_sales_target) * 100 
        ELSE 0 
    END;
    
    estimated_labour := CASE 
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

-- 5. Create trigger to auto-calculate on insert/update
CREATE OR REPLACE FUNCTION trigger_calculate_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Auto-calculate metrics whenever input data changes
    PERFORM calculate_and_update_metrics(NEW.metric_date);
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_calculate_metrics ON daily_service_metrics;

-- Create the trigger
CREATE TRIGGER auto_calculate_metrics
    AFTER INSERT OR UPDATE OF working_days_elapsed, current_net_sales, current_net_labor_sales, number_of_invoices, current_marketing_spend
    ON daily_service_metrics
    FOR EACH ROW
    EXECUTE FUNCTION trigger_calculate_metrics();

-- 6. Enable RLS
ALTER TABLE daily_service_metrics ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
DROP POLICY IF EXISTS daily_service_metrics_policy ON daily_service_metrics;

CREATE POLICY daily_service_metrics_policy ON daily_service_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN role_permissions rp ON ur.role = rp.role 
            JOIN modules m ON rp.module_id = m.id 
            WHERE ur.user_id = auth.uid() 
            AND m.name IN ('accounts', 'workshop') 
            AND rp.can_view = true
        )
    );

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_service_metrics_date ON daily_service_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_daily_service_metrics_updated ON daily_service_metrics(updated_at);

-- 9. Insert sample data
INSERT INTO daily_service_metrics (
    metric_date, 
    working_days_elapsed, 
    current_net_sales, 
    current_net_labor_sales, 
    number_of_invoices, 
    current_marketing_spend,
    notes
) VALUES (
    '2025-01-15', 
    15, 
    150000.00, 
    75000.00, 
    45, 
    12000.00,
    'Sample data for testing'
) ON CONFLICT (metric_date) DO UPDATE SET
    working_days_elapsed = EXCLUDED.working_days_elapsed,
    current_net_sales = EXCLUDED.current_net_sales,
    current_net_labor_sales = EXCLUDED.current_net_labor_sales,
    number_of_invoices = EXCLUDED.number_of_invoices,
    current_marketing_spend = EXCLUDED.current_marketing_spend,
    notes = EXCLUDED.notes,
    updated_at = NOW();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Simplified service metrics schema created successfully!';
END
$$; 