-- ============================================
-- LEASING ACCOUNTS TABLES MIGRATION
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create leasing_monthly_targets table
CREATE TABLE IF NOT EXISTS leasing_monthly_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    a_class_sales_target NUMERIC(15,2) NOT NULL DEFAULT 100000,
    others_sales_target NUMERIC(15,2) NOT NULL DEFAULT 25000,
    total_target NUMERIC(15,2) GENERATED ALWAYS AS (a_class_sales_target + others_sales_target) STORED,
    total_target_112_percent NUMERIC(15,2) GENERATED ALWAYS AS ((a_class_sales_target + others_sales_target) * 1.12) STORED,
    number_of_working_days INTEGER NOT NULL DEFAULT 25 CHECK (number_of_working_days >= 1 AND number_of_working_days <= 31),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(year, month)
);

-- 2. Create leasing_daily_metrics table
CREATE TABLE IF NOT EXISTS leasing_daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    working_days_elapsed INTEGER NOT NULL DEFAULT 0,
    
    -- Manual Input Fields
    current_a_class_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
    current_others_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
    number_of_invoices INTEGER NOT NULL DEFAULT 0,
    excess_mileage NUMERIC(15,2) NOT NULL DEFAULT 0,
    traffic_fines NUMERIC(15,2) NOT NULL DEFAULT 0,
    salik NUMERIC(15,2) NOT NULL DEFAULT 0,
    current_marketing_spend NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    -- Auto-Calculated Fields (will be computed by trigger)
    total_net_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
    current_net_sales_percentage NUMERIC(10,5) NOT NULL DEFAULT 0,
    remaining_a_class_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
    remaining_others_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
    a_class_net_sales_percentage NUMERIC(10,5) NOT NULL DEFAULT 0,
    others_net_sales_percentage NUMERIC(10,5) NOT NULL DEFAULT 0,
    total_daily_average NUMERIC(15,2) NOT NULL DEFAULT 0,
    estimated_net_sales NUMERIC(15,2) NOT NULL DEFAULT 0,
    estimated_net_sales_percentage NUMERIC(10,5) NOT NULL DEFAULT 0,
    daily_cumulative_target NUMERIC(15,2) NOT NULL DEFAULT 0,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leasing_daily_metrics_date ON leasing_daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_leasing_daily_metrics_year_month ON leasing_daily_metrics(year, month);
CREATE INDEX IF NOT EXISTS idx_leasing_monthly_targets_year_month ON leasing_monthly_targets(year, month);

-- 4. Create trigger function to calculate derived fields
CREATE OR REPLACE FUNCTION calculate_leasing_metrics()
RETURNS TRIGGER AS $$
DECLARE
    v_target RECORD;
    v_total_target NUMERIC(15,2);
    v_a_class_target NUMERIC(15,2);
    v_others_target NUMERIC(15,2);
    v_working_days INTEGER;
BEGIN
    -- Get target for the month
    SELECT * INTO v_target
    FROM leasing_monthly_targets
    WHERE year = NEW.year AND month = NEW.month
    LIMIT 1;
    
    -- Default values if no target found
    v_a_class_target := COALESCE(v_target.a_class_sales_target, 100000);
    v_others_target := COALESCE(v_target.others_sales_target, 25000);
    v_total_target := v_a_class_target + v_others_target;
    v_working_days := COALESCE(v_target.number_of_working_days, 25);
    
    -- Calculate total net sales
    NEW.total_net_sales := NEW.current_a_class_sales + NEW.current_others_sales;
    
    -- Calculate percentages
    IF v_total_target > 0 THEN
        NEW.current_net_sales_percentage := (NEW.total_net_sales / v_total_target) * 100;
    ELSE
        NEW.current_net_sales_percentage := 0;
    END IF;
    
    IF v_a_class_target > 0 THEN
        NEW.a_class_net_sales_percentage := (NEW.current_a_class_sales / v_a_class_target) * 100;
    ELSE
        NEW.a_class_net_sales_percentage := 0;
    END IF;
    
    IF v_others_target > 0 THEN
        NEW.others_net_sales_percentage := (NEW.current_others_sales / v_others_target) * 100;
    ELSE
        NEW.others_net_sales_percentage := 0;
    END IF;
    
    -- Calculate remaining sales
    NEW.remaining_a_class_sales := v_a_class_target - NEW.current_a_class_sales;
    NEW.remaining_others_sales := v_others_target - NEW.current_others_sales;
    
    -- Calculate daily average
    IF NEW.working_days_elapsed > 0 THEN
        NEW.total_daily_average := NEW.total_net_sales / NEW.working_days_elapsed;
    ELSE
        NEW.total_daily_average := 0;
    END IF;
    
    -- Calculate estimated net sales
    NEW.estimated_net_sales := NEW.total_daily_average * v_working_days;
    
    -- Calculate estimated percentage
    IF v_total_target > 0 THEN
        NEW.estimated_net_sales_percentage := (NEW.estimated_net_sales / v_total_target) * 100;
    ELSE
        NEW.estimated_net_sales_percentage := 0;
    END IF;
    
    -- Calculate daily cumulative target (pace)
    NEW.daily_cumulative_target := (v_total_target / v_working_days) * NEW.working_days_elapsed;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_leasing_metrics ON leasing_daily_metrics;
CREATE TRIGGER trigger_calculate_leasing_metrics
    BEFORE INSERT OR UPDATE ON leasing_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_leasing_metrics();

-- 6. Create updated_at trigger for targets table
CREATE OR REPLACE FUNCTION update_leasing_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_leasing_targets_updated_at ON leasing_monthly_targets;
CREATE TRIGGER trigger_update_leasing_targets_updated_at
    BEFORE UPDATE ON leasing_monthly_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_leasing_targets_updated_at();

-- 7. Enable RLS (Row Level Security)
ALTER TABLE leasing_monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leasing_daily_metrics ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies (allow authenticated users to read/write)
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow authenticated read for leasing_monthly_targets" ON leasing_monthly_targets;
DROP POLICY IF EXISTS "Allow authenticated insert for leasing_monthly_targets" ON leasing_monthly_targets;
DROP POLICY IF EXISTS "Allow authenticated update for leasing_monthly_targets" ON leasing_monthly_targets;
DROP POLICY IF EXISTS "Allow authenticated delete for leasing_monthly_targets" ON leasing_monthly_targets;

DROP POLICY IF EXISTS "Allow authenticated read for leasing_daily_metrics" ON leasing_daily_metrics;
DROP POLICY IF EXISTS "Allow authenticated insert for leasing_daily_metrics" ON leasing_daily_metrics;
DROP POLICY IF EXISTS "Allow authenticated update for leasing_daily_metrics" ON leasing_daily_metrics;
DROP POLICY IF EXISTS "Allow authenticated delete for leasing_daily_metrics" ON leasing_daily_metrics;

-- Create new policies
CREATE POLICY "Allow authenticated read for leasing_monthly_targets"
    ON leasing_monthly_targets FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert for leasing_monthly_targets"
    ON leasing_monthly_targets FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update for leasing_monthly_targets"
    ON leasing_monthly_targets FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete for leasing_monthly_targets"
    ON leasing_monthly_targets FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read for leasing_daily_metrics"
    ON leasing_daily_metrics FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert for leasing_daily_metrics"
    ON leasing_daily_metrics FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update for leasing_daily_metrics"
    ON leasing_daily_metrics FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete for leasing_daily_metrics"
    ON leasing_daily_metrics FOR DELETE
    TO authenticated
    USING (true);

-- 9. Grant permissions to service role (for API access)
GRANT ALL ON leasing_monthly_targets TO service_role;
GRANT ALL ON leasing_daily_metrics TO service_role;

-- 10. Insert sample target data for current month (optional - uncomment to use)
-- INSERT INTO leasing_monthly_targets (year, month, a_class_sales_target, others_sales_target, number_of_working_days)
-- VALUES (2025, 4, 100000, 25000, 25)
-- ON CONFLICT (year, month) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('leasing_monthly_targets', 'leasing_daily_metrics');

-- Check columns
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'leasing_daily_metrics' ORDER BY ordinal_position;

-- Check triggers
-- SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE trigger_name LIKE '%leasing%';

-- ============================================
-- END OF MIGRATION
-- ============================================

