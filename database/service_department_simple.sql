-- Service Department Performance Tracking System (Simple 2-Table Design)
-- Just targets + metrics, no metadata table

-- 0. CLEANUP: Drop old objects if they exist (ignore errors)
DO $$ 
BEGIN
    -- Drop policies first
    DROP POLICY IF EXISTS "service_inputs_policy" ON service_daily_inputs;
    DROP POLICY IF EXISTS "service_calculations_policy" ON service_calculated_metrics;
    DROP POLICY IF EXISTS "service_definitions_policy" ON service_metric_definitions;
    DROP POLICY IF EXISTS "service_targets_policy" ON service_monthly_targets;
    DROP POLICY IF EXISTS "service_metrics_policy" ON service_metrics;
EXCEPTION WHEN OTHERS THEN 
    NULL; -- Ignore errors
END $$;

DO $$ 
BEGIN
    -- Drop tables
    DROP TABLE IF EXISTS service_daily_inputs CASCADE;
    DROP TABLE IF EXISTS service_calculated_metrics CASCADE;  
    DROP TABLE IF EXISTS service_metric_definitions CASCADE;
EXCEPTION WHEN OTHERS THEN 
    NULL; -- Ignore errors
END $$;

DO $$ 
BEGIN
    -- Drop functions
    DROP FUNCTION IF EXISTS calculate_service_metrics(DATE);
    DROP FUNCTION IF EXISTS calculate_and_store_service_metrics(DATE);
    DROP FUNCTION IF EXISTS get_service_metrics_for_date(DATE);
    DROP FUNCTION IF EXISTS get_service_metrics_range(DATE, DATE, TEXT);
EXCEPTION WHEN OTHERS THEN 
    NULL; -- Ignore errors
END $$;

-- 1. SERVICE DEPARTMENT MONTHLY TARGETS
CREATE TABLE IF NOT EXISTS service_monthly_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    net_sales_target DECIMAL(12,2) NOT NULL,
    net_sales_112_percent DECIMAL(12,2) NOT NULL, -- 112% stretch target
    daily_cumulative_target DECIMAL(12,2) NOT NULL, -- Expected daily pace
    labour_sales_target DECIMAL(12,2) NOT NULL,
    number_of_working_days INTEGER NOT NULL, -- Actual working days (excluding holidays)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_month CHECK (month >= 1 AND month <= 12),
    CONSTRAINT valid_year CHECK (year >= 2020 AND year <= 2050),
    UNIQUE(year, month) -- One target set per month
);

-- 2. SERVICE METRICS (Both inputs and calculated metrics - everything in one table)
CREATE TABLE IF NOT EXISTS service_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL, -- Higher precision for calculations
    metric_type TEXT NOT NULL, -- 'currency', 'percentage', 'count'
    metric_category TEXT NOT NULL, -- 'input', 'calculated'
    unit TEXT, -- 'AED', '%', 'units', 'days'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_metric_type CHECK (metric_type IN ('currency', 'percentage', 'count')),
    CONSTRAINT valid_metric_category CHECK (metric_category IN ('input', 'calculated')),
    UNIQUE(metric_date, metric_name) -- One value per metric per date
);

-- 3. FUNCTION TO CALCULATE AND STORE ALL METRICS FOR A DATE
CREATE OR REPLACE FUNCTION calculate_and_store_service_metrics(target_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    calc_year INTEGER;
    calc_month INTEGER;
    target_rec RECORD;
    
    -- Input values
    working_days INTEGER;
    net_sales DECIMAL(12,2);
    labor_sales DECIMAL(12,2);
    invoice_count INTEGER;
    marketing_spend DECIMAL(12,2);
    
    -- Calculated values
    net_sales_pct DECIMAL(5,2);
    labour_sales_pct DECIMAL(5,2);
    remaining_net DECIMAL(12,2);
    remaining_labour DECIMAL(12,2);
    daily_avg DECIMAL(12,2);
    estimated_net DECIMAL(12,2);
    estimated_net_pct DECIMAL(5,2);
    estimated_labour DECIMAL(12,2);
    estimated_labour_pct DECIMAL(5,2);
    daily_needed DECIMAL(12,2);
    remaining_days INTEGER;
    labour_ratio DECIMAL(5,4);
BEGIN
    -- Extract year and month
    calc_year := EXTRACT(YEAR FROM target_date);
    calc_month := EXTRACT(MONTH FROM target_date);
    
    -- Get target data for this month
    SELECT * INTO target_rec
    FROM service_monthly_targets
    WHERE year = calc_year AND month = calc_month;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No target data found for year: %, month: %', calc_year, calc_month;
        RETURN FALSE;
    END IF;
    
    -- Get input values from service_metrics table
    SELECT metric_value INTO working_days FROM service_metrics WHERE metric_date = target_date AND metric_name = 'working_days_elapsed';
    SELECT metric_value INTO net_sales FROM service_metrics WHERE metric_date = target_date AND metric_name = 'current_net_sales';
    SELECT metric_value INTO labor_sales FROM service_metrics WHERE metric_date = target_date AND metric_name = 'current_net_labor_sales';
    SELECT metric_value INTO invoice_count FROM service_metrics WHERE metric_date = target_date AND metric_name = 'number_of_invoices';
    SELECT metric_value INTO marketing_spend FROM service_metrics WHERE metric_date = target_date AND metric_name = 'current_marketing_spend';
    
    -- Check if we have all required input data
    IF working_days IS NULL OR net_sales IS NULL OR labor_sales IS NULL THEN
        RAISE NOTICE 'Missing input data for date: %', target_date;
        RETURN FALSE;
    END IF;
    
    -- Calculate metrics
    net_sales_pct := (net_sales / target_rec.net_sales_target) * 100;
    labour_sales_pct := (labor_sales / target_rec.labour_sales_target) * 100;
    remaining_net := target_rec.net_sales_target - net_sales;
    remaining_labour := target_rec.labour_sales_target - labor_sales;
    daily_avg := net_sales / working_days;
    estimated_net := daily_avg * target_rec.number_of_working_days;
    estimated_net_pct := (estimated_net / target_rec.net_sales_target) * 100;
    
    -- Calculate labor ratio from current data
    IF net_sales > 0 THEN
        labour_ratio := labor_sales / net_sales;
    ELSE
        labour_ratio := 0;
    END IF;
    
    estimated_labour := estimated_net * labour_ratio;
    estimated_labour_pct := (estimated_labour / target_rec.labour_sales_target) * 100;
    
    -- Calculate daily average needed
    remaining_days := target_rec.number_of_working_days - working_days;
    IF remaining_days > 0 THEN
        daily_needed := remaining_net / remaining_days;
    ELSE
        daily_needed := 0;
    END IF;
    
    -- Insert/Update calculated metrics
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
END $$;

-- 4. SAMPLE DATA - JANUARY 2025 TARGETS
INSERT INTO service_monthly_targets (year, month, net_sales_target, net_sales_112_percent, daily_cumulative_target, labour_sales_target, number_of_working_days)
VALUES (2025, 1, 500000.00, 560000.00, 25000.00, 200000.00, 20)
ON CONFLICT (year, month) DO NOTHING;

-- 5. ROW LEVEL SECURITY
ALTER TABLE service_monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_metrics ENABLE ROW LEVEL SECURITY;

-- Drop current policies if they exist
DROP POLICY IF EXISTS "service_targets_policy" ON service_monthly_targets;
DROP POLICY IF EXISTS "service_metrics_policy" ON service_metrics;

CREATE POLICY "service_targets_policy" ON service_monthly_targets FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_view = true
    )
);

CREATE POLICY "service_metrics_policy" ON service_metrics FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_view = true
    )
    OR EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'workshop') 
        WHERE can_view = true
    )
);

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_service_metrics_date ON service_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_service_metrics_name ON service_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_service_metrics_date_name ON service_metrics(metric_date, metric_name);
CREATE INDEX IF NOT EXISTS idx_service_metrics_category ON service_metrics(metric_category);

-- 7. SIMPLE HELPER FUNCTIONS

-- Get all metrics for a specific date
CREATE OR REPLACE FUNCTION get_service_metrics_for_date(target_date DATE)
RETURNS TABLE(
    metric_name TEXT,
    metric_value DECIMAL(15,4),
    metric_type TEXT,
    metric_category TEXT,
    unit TEXT
)
LANGUAGE SQL
AS $$
    SELECT 
        metric_name,
        metric_value,
        metric_type,
        metric_category,
        unit
    FROM service_metrics
    WHERE metric_date = target_date
    ORDER BY 
        CASE metric_category 
            WHEN 'input' THEN 1 
            WHEN 'calculated' THEN 2 
        END,
        metric_name;
$$;

-- Get metrics for a date range (for charts)
CREATE OR REPLACE FUNCTION get_service_metrics_range(start_date DATE, end_date DATE, filter_metric_name TEXT DEFAULT NULL)
RETURNS TABLE(
    metric_date DATE,
    metric_name TEXT,
    metric_value DECIMAL(15,4),
    metric_type TEXT,
    unit TEXT
)
LANGUAGE SQL
AS $$
    SELECT 
        metric_date,
        metric_name,
        metric_value,
        metric_type,
        unit
    FROM service_metrics
    WHERE metric_date BETWEEN start_date AND end_date
    AND (filter_metric_name IS NULL OR metric_name = filter_metric_name)
    ORDER BY metric_date, metric_name;
$$;

SELECT 'Service Department tracking system (simple 2-table design) created successfully!' as status; 