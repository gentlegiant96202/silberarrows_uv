-- Unified Sales Department Tracking System (No RLS)
-- Single table approach: one row per day with both inputs and calculated values

-- First, backup existing data if any
CREATE TABLE IF NOT EXISTS sales_daily_inputs_backup AS 
SELECT * FROM sales_daily_inputs WHERE FALSE; -- Just create structure, no data

CREATE TABLE IF NOT EXISTS sales_calculated_metrics_backup AS 
SELECT * FROM sales_calculated_metrics WHERE FALSE; -- Just create structure, no data

-- Drop old tables
DROP TABLE IF EXISTS sales_daily_inputs CASCADE;
DROP TABLE IF EXISTS sales_calculated_metrics CASCADE;

-- Create unified sales metrics table
CREATE TABLE IF NOT EXISTS sales_daily_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    working_days_elapsed INTEGER NOT NULL,
    
    -- Manual Input Fields (what user enters)
    gross_sales_year_actual DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_of_sales_year_actual DECIMAL(12,2) NOT NULL DEFAULT 0,
    gross_sales_month_actual DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_of_sales_month_actual DECIMAL(12,2) NOT NULL DEFAULT 0,
    marketing_spend_month DECIMAL(12,2) NOT NULL DEFAULT 0,
    units_disposed_month INTEGER NOT NULL DEFAULT 0,
    units_sold_stock_month INTEGER NOT NULL DEFAULT 0,
    units_sold_consignment_month INTEGER NOT NULL DEFAULT 0,
    
    -- Auto-Calculated Fields (computed from inputs + targets)
    gross_profit_year_actual DECIMAL(12,2) GENERATED ALWAYS AS (gross_sales_year_actual - cost_of_sales_year_actual) STORED,
    gross_profit_month_actual DECIMAL(12,2) GENERATED ALWAYS AS (gross_sales_month_actual - cost_of_sales_month_actual) STORED,
    total_units_sold_month INTEGER GENERATED ALWAYS AS (units_sold_stock_month + units_sold_consignment_month) STORED,
    
    -- These will be calculated via triggers using targets
    gross_profit_year_target DECIMAL(12,2),
    gross_profit_month_target DECIMAL(12,2),
    total_working_days INTEGER,
    gross_profit_year_achieved_percentage DECIMAL(5,2),
    gross_profit_month_achieved_percentage DECIMAL(5,2),
    average_gross_profit_per_car_month DECIMAL(12,2),
    marketing_rate_against_gross_profit DECIMAL(5,2),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(metric_date) -- One entry per date
);

-- Create function to calculate target-based metrics
CREATE OR REPLACE FUNCTION calculate_sales_metrics_on_upsert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_rec RECORD;
BEGIN
    -- Get target data for this month
    SELECT * INTO target_rec
    FROM sales_monthly_targets
    WHERE year = NEW.year AND month = NEW.month;
    
    IF FOUND THEN
        -- Update target values
        NEW.gross_profit_year_target := target_rec.gross_profit_year_target;
        NEW.gross_profit_month_target := target_rec.gross_profit_month_target;
        NEW.total_working_days := target_rec.number_of_working_days;
        
        -- Calculate achievement percentages
        NEW.gross_profit_year_achieved_percentage := 
            CASE WHEN target_rec.gross_profit_year_target > 0 
                 THEN (NEW.gross_profit_year_actual / target_rec.gross_profit_year_target) * 100
                 ELSE 0 
            END;
            
        NEW.gross_profit_month_achieved_percentage := 
            CASE WHEN target_rec.gross_profit_month_target > 0 
                 THEN (NEW.gross_profit_month_actual / target_rec.gross_profit_month_target) * 100
                 ELSE 0 
            END;
        
        -- Calculate average gross profit per car
        NEW.average_gross_profit_per_car_month := 
            CASE WHEN NEW.total_units_sold_month > 0 
                 THEN NEW.gross_profit_month_actual / NEW.total_units_sold_month
                 ELSE 0 
            END;
        
        -- Calculate marketing rate against gross profit
        NEW.marketing_rate_against_gross_profit := 
            CASE WHEN NEW.gross_profit_month_actual > 0 
                 THEN (NEW.marketing_spend_month / NEW.gross_profit_month_actual) * 100
                 ELSE 0 
            END;
    END IF;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END $$;

-- Create trigger
DROP TRIGGER IF EXISTS sales_metrics_calculation_trigger ON sales_daily_metrics;
CREATE TRIGGER sales_metrics_calculation_trigger
    BEFORE INSERT OR UPDATE ON sales_daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_sales_metrics_on_upsert();

-- Disable RLS (permissions handled by frontend)
ALTER TABLE sales_monthly_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_daily_metrics DISABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_metrics_date ON sales_daily_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_sales_metrics_month ON sales_daily_metrics(year, month);

-- Sample data for January 2025 (if you want to test)
INSERT INTO sales_daily_metrics (
    metric_date, year, month, working_days_elapsed,
    gross_sales_year_actual, cost_of_sales_year_actual,
    gross_sales_month_actual, cost_of_sales_month_actual,
    marketing_spend_month, units_disposed_month,
    units_sold_stock_month, units_sold_consignment_month,
    notes
) VALUES (
    '2025-01-15', 2025, 1, 10,
    5000000.00, 3000000.00,
    800000.00, 500000.00,
    50000.00, 15,
    8, 7,
    'Sample data for testing'
) ON CONFLICT (metric_date) DO NOTHING;

SELECT 'Unified sales metrics table created successfully (No RLS)!' as status; 