-- Service Department Performance Tracking System
-- Monthly targets with cumulative daily inputs and calculated metrics

-- 1. SERVICE DEPARTMENT MONTHLY TARGETS (Hardcoded values per month/year)
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

-- 2. SERVICE DEPARTMENT DAILY INPUTS (Cumulative values entered by accounts team)
CREATE TABLE IF NOT EXISTS service_daily_inputs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    input_date DATE NOT NULL,
    working_days_elapsed INTEGER NOT NULL, -- How many working days have passed this month
    current_net_sales DECIMAL(12,2) NOT NULL, -- Cumulative net sales so far this month
    current_net_labor_sales DECIMAL(12,2) NOT NULL, -- Cumulative labor sales so far this month
    number_of_invoices INTEGER NOT NULL, -- Total invoices issued so far this month
    current_marketing_spend DECIMAL(12,2) NOT NULL, -- Total marketing spend so far this month
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(input_date) -- One entry per date
);

-- 3. SERVICE DEPARTMENT CALCULATED METRICS (Auto-computed from inputs + targets)
CREATE TABLE IF NOT EXISTS service_calculated_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    calculation_date DATE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    -- Input values (copied for reference)
    working_days_elapsed INTEGER NOT NULL,
    current_net_sales DECIMAL(12,2) NOT NULL,
    current_net_labor_sales DECIMAL(12,2) NOT NULL,
    number_of_invoices INTEGER NOT NULL,
    current_marketing_spend DECIMAL(12,2) NOT NULL,
    
    -- Target values (copied for reference)
    net_sales_target DECIMAL(12,2) NOT NULL,
    labour_sales_target DECIMAL(12,2) NOT NULL,
    total_working_days INTEGER NOT NULL,
    
    -- Calculated metrics
    current_net_sales_percentage DECIMAL(5,2) NOT NULL, -- (current_net_sales / net_sales_target) * 100
    current_labour_sales_percentage DECIMAL(5,2) NOT NULL, -- (current_net_labor_sales / labour_sales_target) * 100
    remaining_net_sales DECIMAL(12,2) NOT NULL, -- net_sales_target - current_net_sales
    remaining_labour_sales DECIMAL(12,2) NOT NULL, -- labour_sales_target - current_net_labor_sales
    current_daily_average DECIMAL(12,2) NOT NULL, -- current_net_sales / working_days_elapsed
    estimated_net_sales DECIMAL(12,2) NOT NULL, -- current_daily_average * total_working_days
    estimated_net_sales_percentage DECIMAL(5,2) NOT NULL, -- (estimated_net_sales / net_sales_target) * 100
    estimated_labor_sales DECIMAL(12,2) NOT NULL, -- (estimated_net_sales * labor_ratio)
    estimated_labor_sales_percentage DECIMAL(5,2) NOT NULL, -- (estimated_labor_sales / labour_sales_target) * 100
    daily_average_needed DECIMAL(12,2) NOT NULL, -- remaining_net_sales / remaining_working_days
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(calculation_date) -- One calculation per date
);

-- 4. FUNCTION TO CALCULATE ALL METRICS FOR A GIVEN DATE
CREATE OR REPLACE FUNCTION calculate_service_metrics(target_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    input_rec RECORD;
    target_rec RECORD;
    calc_year INTEGER;
    calc_month INTEGER;
    
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
    -- Extract year and month from target date
    calc_year := EXTRACT(YEAR FROM target_date);
    calc_month := EXTRACT(MONTH FROM target_date);
    
    -- Get input data for this date
    SELECT * INTO input_rec
    FROM service_daily_inputs
    WHERE input_date = target_date;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No input data found for date: %', target_date;
        RETURN FALSE;
    END IF;
    
    -- Get target data for this month
    SELECT * INTO target_rec
    FROM service_monthly_targets
    WHERE year = calc_year AND month = calc_month;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No target data found for year: %, month: %', calc_year, calc_month;
        RETURN FALSE;
    END IF;
    
    -- Calculate metrics
    net_sales_pct := (input_rec.current_net_sales / target_rec.net_sales_target) * 100;
    labour_sales_pct := (input_rec.current_net_labor_sales / target_rec.labour_sales_target) * 100;
    remaining_net := target_rec.net_sales_target - input_rec.current_net_sales;
    remaining_labour := target_rec.labour_sales_target - input_rec.current_net_labor_sales;
    daily_avg := input_rec.current_net_sales / input_rec.working_days_elapsed;
    estimated_net := daily_avg * target_rec.number_of_working_days;
    estimated_net_pct := (estimated_net / target_rec.net_sales_target) * 100;
    
    -- Calculate labor ratio from current data
    IF input_rec.current_net_sales > 0 THEN
        labour_ratio := input_rec.current_net_labor_sales / input_rec.current_net_sales;
    ELSE
        labour_ratio := 0;
    END IF;
    
    estimated_labour := estimated_net * labour_ratio;
    estimated_labour_pct := (estimated_labour / target_rec.labour_sales_target) * 100;
    
    -- Calculate daily average needed for remaining days
    remaining_days := target_rec.number_of_working_days - input_rec.working_days_elapsed;
    IF remaining_days > 0 THEN
        daily_needed := remaining_net / remaining_days;
    ELSE
        daily_needed := 0;
    END IF;
    
    -- Insert/Update calculated metrics
    INSERT INTO service_calculated_metrics (
        calculation_date, year, month,
        working_days_elapsed, current_net_sales, current_net_labor_sales, 
        number_of_invoices, current_marketing_spend,
        net_sales_target, labour_sales_target, total_working_days,
        current_net_sales_percentage, current_labour_sales_percentage,
        remaining_net_sales, remaining_labour_sales, current_daily_average,
        estimated_net_sales, estimated_net_sales_percentage,
        estimated_labor_sales, estimated_labor_sales_percentage, daily_average_needed
    ) VALUES (
        target_date, calc_year, calc_month,
        input_rec.working_days_elapsed, input_rec.current_net_sales, input_rec.current_net_labor_sales,
        input_rec.number_of_invoices, input_rec.current_marketing_spend,
        target_rec.net_sales_target, target_rec.labour_sales_target, target_rec.number_of_working_days,
        net_sales_pct, labour_sales_pct, remaining_net, remaining_labour, daily_avg,
        estimated_net, estimated_net_pct, estimated_labour, estimated_labour_pct, daily_needed
    )
    ON CONFLICT (calculation_date) 
    DO UPDATE SET
        working_days_elapsed = EXCLUDED.working_days_elapsed,
        current_net_sales = EXCLUDED.current_net_sales,
        current_net_labor_sales = EXCLUDED.current_net_labor_sales,
        number_of_invoices = EXCLUDED.number_of_invoices,
        current_marketing_spend = EXCLUDED.current_marketing_spend,
        current_net_sales_percentage = EXCLUDED.current_net_sales_percentage,
        current_labour_sales_percentage = EXCLUDED.current_labour_sales_percentage,
        remaining_net_sales = EXCLUDED.remaining_net_sales,
        remaining_labour_sales = EXCLUDED.remaining_labour_sales,
        current_daily_average = EXCLUDED.current_daily_average,
        estimated_net_sales = EXCLUDED.estimated_net_sales,
        estimated_net_sales_percentage = EXCLUDED.estimated_net_sales_percentage,
        estimated_labor_sales = EXCLUDED.estimated_labor_sales,
        estimated_labor_sales_percentage = EXCLUDED.estimated_labor_sales_percentage,
        daily_average_needed = EXCLUDED.daily_average_needed;
    
    RETURN TRUE;
END $$;

-- 5. SAMPLE DATA - JANUARY 2025 TARGETS
INSERT INTO service_monthly_targets (year, month, net_sales_target, net_sales_112_percent, daily_cumulative_target, labour_sales_target, number_of_working_days)
VALUES (2025, 1, 500000.00, 560000.00, 25000.00, 200000.00, 20)
ON CONFLICT (year, month) DO NOTHING;

-- 6. ROW LEVEL SECURITY
ALTER TABLE service_monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_calculated_metrics ENABLE ROW LEVEL SECURITY;

-- Allow accounts users to access service data
CREATE POLICY "service_targets_policy" ON service_monthly_targets FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_view = true
    )
);

CREATE POLICY "service_inputs_policy" ON service_daily_inputs FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_view = true
    )
);

CREATE POLICY "service_calculations_policy" ON service_calculated_metrics FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_view = true
    )
    OR EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'workshop') 
        WHERE can_view = true
    )
);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_service_inputs_date ON service_daily_inputs(input_date);
CREATE INDEX IF NOT EXISTS idx_service_calculations_date ON service_calculated_metrics(calculation_date);
CREATE INDEX IF NOT EXISTS idx_service_calculations_month ON service_calculated_metrics(year, month);

SELECT 'Service Department tracking system created successfully!' as status; 