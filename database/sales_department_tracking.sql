-- Sales Department Performance Tracking System
-- Monthly targets with cumulative daily inputs and calculated metrics
-- Exact same design pattern as service_department_tracking.sql

-- 1. SALES DEPARTMENT MONTHLY TARGETS (Hardcoded values per month/year)
CREATE TABLE IF NOT EXISTS sales_monthly_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    gross_profit_year_target DECIMAL(12,2) NOT NULL,
    gross_profit_month_target DECIMAL(12,2) NOT NULL,
    number_of_working_days INTEGER NOT NULL, -- Actual working days (excluding holidays)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_month CHECK (month >= 1 AND month <= 12),
    CONSTRAINT valid_year CHECK (year >= 2020 AND year <= 2050),
    UNIQUE(year, month) -- One target set per month
);

-- 2. SALES DEPARTMENT DAILY INPUTS (Cumulative values entered by accounts team)
CREATE TABLE IF NOT EXISTS sales_daily_inputs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    input_date DATE NOT NULL,
    working_days_elapsed INTEGER NOT NULL, -- How many working days have passed this month
    
    -- Year-to-date cumulative inputs
    gross_sales_year_actual DECIMAL(12,2) NOT NULL, -- Cumulative gross sales for the year
    cost_of_sales_year_actual DECIMAL(12,2) NOT NULL, -- Cumulative cost of sales for the year
    
    -- Month-to-date cumulative inputs
    gross_sales_month_actual DECIMAL(12,2) NOT NULL, -- Cumulative gross sales for the month
    cost_of_sales_month_actual DECIMAL(12,2) NOT NULL, -- Cumulative cost of sales for the month
    marketing_spend_month DECIMAL(12,2) NOT NULL, -- Total marketing spend for the month
    
    -- Unit counts for the month (cumulative)
    units_disposed_month INTEGER NOT NULL, -- Total units disposed cars for the month
    units_sold_stock_month INTEGER NOT NULL, -- Total units sold from stock inventory for the month
    units_sold_consignment_month INTEGER NOT NULL, -- Total units sold from consignment for the month
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(input_date) -- One entry per date
);

-- 3. SALES DEPARTMENT CALCULATED METRICS (Auto-computed from inputs + targets)
CREATE TABLE IF NOT EXISTS sales_calculated_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    calculation_date DATE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    
    -- Input values (copied for reference)
    working_days_elapsed INTEGER NOT NULL,
    gross_sales_year_actual DECIMAL(12,2) NOT NULL,
    cost_of_sales_year_actual DECIMAL(12,2) NOT NULL,
    gross_sales_month_actual DECIMAL(12,2) NOT NULL,
    cost_of_sales_month_actual DECIMAL(12,2) NOT NULL,
    marketing_spend_month DECIMAL(12,2) NOT NULL,
    units_disposed_month INTEGER NOT NULL,
    units_sold_stock_month INTEGER NOT NULL,
    units_sold_consignment_month INTEGER NOT NULL,
    
    -- Target values (copied for reference)
    gross_profit_year_target DECIMAL(12,2) NOT NULL,
    gross_profit_month_target DECIMAL(12,2) NOT NULL,
    total_working_days INTEGER NOT NULL,
    
    -- Calculated metrics
    gross_profit_year_actual DECIMAL(12,2) NOT NULL, -- gross_sales_year_actual - cost_of_sales_year_actual
    gross_profit_year_achieved_percentage DECIMAL(5,2) NOT NULL, -- (gross_profit_year_actual / gross_profit_year_target) * 100
    gross_profit_month_actual DECIMAL(12,2) NOT NULL, -- gross_sales_month_actual - cost_of_sales_month_actual
    gross_profit_month_achieved_percentage DECIMAL(5,2) NOT NULL, -- (gross_profit_month_actual / gross_profit_month_target) * 100
    total_units_sold_month INTEGER NOT NULL, -- units_sold_stock_month + units_sold_consignment_month
    average_gross_profit_per_car_month DECIMAL(12,2) NOT NULL, -- gross_profit_month_actual / total_units_sold_month
    marketing_rate_against_gross_profit DECIMAL(5,2) NOT NULL, -- (marketing_spend_month / gross_profit_month_actual) * 100
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(calculation_date) -- One calculation per date
);

-- 4. FUNCTION TO CALCULATE ALL METRICS FOR A GIVEN DATE
CREATE OR REPLACE FUNCTION calculate_sales_metrics(target_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    input_rec RECORD;
    target_rec RECORD;
    calc_year INTEGER;
    calc_month INTEGER;
    
    -- Calculated values
    gross_profit_year_calc DECIMAL(12,2);
    gross_profit_year_achieved_pct DECIMAL(5,2);
    gross_profit_month_calc DECIMAL(12,2);
    gross_profit_month_achieved_pct DECIMAL(5,2);
    total_units_sold_calc INTEGER;
    avg_gross_profit_per_car DECIMAL(12,2);
    marketing_rate_calc DECIMAL(5,2);
BEGIN
    -- Extract year and month from target date
    calc_year := EXTRACT(YEAR FROM target_date);
    calc_month := EXTRACT(MONTH FROM target_date);
    
    -- Get input data for this date
    SELECT * INTO input_rec
    FROM sales_daily_inputs
    WHERE input_date = target_date;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No input data found for date: %', target_date;
        RETURN FALSE;
    END IF;
    
    -- Get target data for this month
    SELECT * INTO target_rec
    FROM sales_monthly_targets
    WHERE year = calc_year AND month = calc_month;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'No target data found for year: %, month: %', calc_year, calc_month;
        RETURN FALSE;
    END IF;
    
    -- Calculate metrics
    gross_profit_year_calc := input_rec.gross_sales_year_actual - input_rec.cost_of_sales_year_actual;
    gross_profit_year_achieved_pct := (gross_profit_year_calc / target_rec.gross_profit_year_target) * 100;
    gross_profit_month_calc := input_rec.gross_sales_month_actual - input_rec.cost_of_sales_month_actual;
    gross_profit_month_achieved_pct := (gross_profit_month_calc / target_rec.gross_profit_month_target) * 100;
    total_units_sold_calc := input_rec.units_sold_stock_month + input_rec.units_sold_consignment_month;
    
    -- Calculate average gross profit per car (avoid division by zero)
    IF total_units_sold_calc > 0 THEN
        avg_gross_profit_per_car := gross_profit_month_calc / total_units_sold_calc;
    ELSE
        avg_gross_profit_per_car := 0;
    END IF;
    
    -- Calculate marketing rate against gross profit (avoid division by zero)
    IF gross_profit_month_calc > 0 THEN
        marketing_rate_calc := (input_rec.marketing_spend_month / gross_profit_month_calc) * 100;
    ELSE
        marketing_rate_calc := 0;
    END IF;
    
    -- Insert/Update calculated metrics
    INSERT INTO sales_calculated_metrics (
        calculation_date, year, month,
        working_days_elapsed, gross_sales_year_actual, cost_of_sales_year_actual,
        gross_sales_month_actual, cost_of_sales_month_actual, marketing_spend_month,
        units_disposed_month, units_sold_stock_month, units_sold_consignment_month,
        gross_profit_year_target, gross_profit_month_target, total_working_days,
        gross_profit_year_actual, gross_profit_year_achieved_percentage,
        gross_profit_month_actual, gross_profit_month_achieved_percentage,
        total_units_sold_month, average_gross_profit_per_car_month, marketing_rate_against_gross_profit
    ) VALUES (
        target_date, calc_year, calc_month,
        input_rec.working_days_elapsed, input_rec.gross_sales_year_actual, input_rec.cost_of_sales_year_actual,
        input_rec.gross_sales_month_actual, input_rec.cost_of_sales_month_actual, input_rec.marketing_spend_month,
        input_rec.units_disposed_month, input_rec.units_sold_stock_month, input_rec.units_sold_consignment_month,
        target_rec.gross_profit_year_target, target_rec.gross_profit_month_target, target_rec.number_of_working_days,
        gross_profit_year_calc, gross_profit_year_achieved_pct,
        gross_profit_month_calc, gross_profit_month_achieved_pct,
        total_units_sold_calc, avg_gross_profit_per_car, marketing_rate_calc
    )
    ON CONFLICT (calculation_date) 
    DO UPDATE SET
        working_days_elapsed = EXCLUDED.working_days_elapsed,
        gross_sales_year_actual = EXCLUDED.gross_sales_year_actual,
        cost_of_sales_year_actual = EXCLUDED.cost_of_sales_year_actual,
        gross_sales_month_actual = EXCLUDED.gross_sales_month_actual,
        cost_of_sales_month_actual = EXCLUDED.cost_of_sales_month_actual,
        marketing_spend_month = EXCLUDED.marketing_spend_month,
        units_disposed_month = EXCLUDED.units_disposed_month,
        units_sold_stock_month = EXCLUDED.units_sold_stock_month,
        units_sold_consignment_month = EXCLUDED.units_sold_consignment_month,
        gross_profit_year_actual = EXCLUDED.gross_profit_year_actual,
        gross_profit_year_achieved_percentage = EXCLUDED.gross_profit_year_achieved_percentage,
        gross_profit_month_actual = EXCLUDED.gross_profit_month_actual,
        gross_profit_month_achieved_percentage = EXCLUDED.gross_profit_month_achieved_percentage,
        total_units_sold_month = EXCLUDED.total_units_sold_month,
        average_gross_profit_per_car_month = EXCLUDED.average_gross_profit_per_car_month,
        marketing_rate_against_gross_profit = EXCLUDED.marketing_rate_against_gross_profit;
    
    RETURN TRUE;
END $$;

-- 5. SAMPLE DATA - JANUARY 2025 TARGETS
INSERT INTO sales_monthly_targets (year, month, gross_profit_year_target, gross_profit_month_target, number_of_working_days)
VALUES (2025, 1, 12000000.00, 1000000.00, 20)
ON CONFLICT (year, month) DO NOTHING;

-- 6. ROW LEVEL SECURITY
ALTER TABLE sales_monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_calculated_metrics ENABLE ROW LEVEL SECURITY;

-- Allow accounts users to access sales data
CREATE POLICY "sales_targets_policy" ON sales_monthly_targets FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_view = true
    )
);

CREATE POLICY "sales_inputs_policy" ON sales_daily_inputs FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_view = true
    )
);

CREATE POLICY "sales_calculations_policy" ON sales_calculated_metrics FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'accounts') 
        WHERE can_view = true
    )
    OR EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid(), 'uv_crm') 
        WHERE can_view = true
    )
);

-- 7. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_sales_inputs_date ON sales_daily_inputs(input_date);
CREATE INDEX IF NOT EXISTS idx_sales_calculations_date ON sales_calculated_metrics(calculation_date);
CREATE INDEX IF NOT EXISTS idx_sales_calculations_month ON sales_calculated_metrics(year, month);

SELECT 'Sales Department tracking system created successfully!' as status; 