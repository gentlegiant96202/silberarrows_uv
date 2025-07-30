-- Accounts Business Intelligence System
-- Complete database schema for financial targets, daily inputs, and cross-module dashboards

-- 1. TARGETS TABLE - Annual/Monthly targets by department
CREATE TABLE IF NOT EXISTS accounts_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    department TEXT NOT NULL, -- 'uv_crm', 'marketing', 'workshop', 'leasing', 'overall'
    metric_name TEXT NOT NULL, -- 'monthly_sales_target', 'lead_conversion_rate', etc.
    metric_type TEXT NOT NULL, -- 'currency', 'percentage', 'count', 'ratio'
    target_value DECIMAL(15,2) NOT NULL,
    period_type TEXT NOT NULL, -- 'monthly', 'quarterly', 'annual'
    period_date DATE NOT NULL, -- The month/quarter/year this target applies to
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_department CHECK (department IN ('uv_crm', 'marketing', 'workshop', 'leasing', 'overall')),
    CONSTRAINT valid_metric_type CHECK (metric_type IN ('currency', 'percentage', 'count', 'ratio')),
    CONSTRAINT valid_period_type CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'annual'))
);

-- 2. DAILY INPUTS TABLE - Daily operational data
CREATE TABLE IF NOT EXISTS accounts_daily_inputs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    input_date DATE NOT NULL,
    department TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(15,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_daily_department CHECK (department IN ('uv_crm', 'marketing', 'workshop', 'leasing', 'overall')),
    UNIQUE(input_date, department, metric_name) -- Prevent duplicate entries for same day/department/metric
);

-- 3. CALCULATED METRICS TABLE - Computed KPIs and ratios
CREATE TABLE IF NOT EXISTS accounts_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    calculation_date DATE NOT NULL,
    department TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    calculated_value DECIMAL(15,2) NOT NULL,
    calculation_formula TEXT, -- Store the formula used for transparency
    source_metrics JSONB, -- Store which input metrics were used
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_calc_department CHECK (department IN ('uv_crm', 'marketing', 'workshop', 'leasing', 'overall')),
    UNIQUE(calculation_date, department, metric_name)
);

-- 4. DASHBOARD CONFIGURATIONS - What charts/metrics each module displays
CREATE TABLE IF NOT EXISTS accounts_dashboard_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    module_name TEXT NOT NULL, -- Which module this config is for
    chart_type TEXT NOT NULL, -- 'line', 'bar', 'pie', 'metric_card', 'progress'
    chart_title TEXT NOT NULL,
    metrics JSONB NOT NULL, -- Array of metric names to display
    time_period TEXT NOT NULL, -- 'last_7_days', 'last_30_days', 'current_month', etc.
    chart_order INTEGER DEFAULT 0, -- Display order on dashboard
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_module CHECK (module_name IN ('accounts', 'uv_crm', 'marketing', 'workshop', 'leasing')),
    CONSTRAINT valid_chart_type CHECK (chart_type IN ('line', 'bar', 'pie', 'metric_card', 'progress', 'gauge'))
);

-- 5. METRIC DEFINITIONS - Centralized metric definitions and formulas
CREATE TABLE IF NOT EXISTS accounts_metric_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    metric_type TEXT NOT NULL,
    department TEXT NOT NULL,
    calculation_type TEXT NOT NULL, -- 'input', 'calculated', 'target'
    formula TEXT, -- For calculated metrics
    unit TEXT, -- 'AED', '%', 'units', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_calc_type CHECK (calculation_type IN ('input', 'calculated', 'target'))
);

-- 6. SAMPLE METRIC DEFINITIONS
INSERT INTO accounts_metric_definitions (metric_name, display_name, description, metric_type, department, calculation_type, unit) VALUES
-- UV CRM Metrics
('daily_leads', 'Daily Leads', 'Number of new leads generated', 'count', 'uv_crm', 'input', 'leads'),
('daily_sales', 'Daily Sales', 'Number of cars sold', 'count', 'uv_crm', 'input', 'units'),
('daily_revenue', 'Daily Revenue', 'Total sales revenue', 'currency', 'uv_crm', 'input', 'AED'),
('lead_conversion_rate', 'Lead Conversion Rate', 'Percentage of leads converted to sales', 'percentage', 'uv_crm', 'calculated', '%'),
('monthly_sales_target', 'Monthly Sales Target', 'Target number of cars to sell this month', 'count', 'uv_crm', 'target', 'units'),

-- Marketing Metrics
('ad_spend', 'Daily Ad Spend', 'Amount spent on advertising', 'currency', 'marketing', 'input', 'AED'),
('campaign_impressions', 'Campaign Impressions', 'Number of ad impressions', 'count', 'marketing', 'input', 'impressions'),
('campaign_clicks', 'Campaign Clicks', 'Number of ad clicks', 'count', 'marketing', 'input', 'clicks'),
('cost_per_lead', 'Cost Per Lead', 'Average cost to acquire a lead', 'currency', 'marketing', 'calculated', 'AED'),
('roas', 'Return on Ad Spend', 'Revenue generated per AED spent on ads', 'ratio', 'marketing', 'calculated', 'x'),

-- Workshop Metrics
('service_jobs', 'Daily Service Jobs', 'Number of service jobs completed', 'count', 'workshop', 'input', 'jobs'),
('service_revenue', 'Service Revenue', 'Revenue from service department', 'currency', 'workshop', 'input', 'AED'),
('average_job_value', 'Average Job Value', 'Average revenue per service job', 'currency', 'workshop', 'calculated', 'AED'),
('service_efficiency', 'Service Efficiency', 'Jobs completed vs capacity', 'percentage', 'workshop', 'calculated', '%'),

-- Leasing Metrics
('leasing_contracts', 'Daily Leasing Contracts', 'Number of leasing contracts signed', 'count', 'leasing', 'input', 'contracts'),
('leasing_revenue', 'Leasing Revenue', 'Revenue from leasing department', 'currency', 'leasing', 'input', 'AED'),
('average_lease_value', 'Average Lease Value', 'Average value per lease contract', 'currency', 'leasing', 'calculated', 'AED')

ON CONFLICT (metric_name) DO NOTHING;

-- 7. SAMPLE DASHBOARD CONFIGURATIONS
INSERT INTO accounts_dashboard_configs (module_name, chart_type, chart_title, metrics, time_period, chart_order) VALUES
-- Accounts Module Dashboard
('accounts', 'metric_card', 'Overall Performance', '["daily_revenue", "daily_sales", "daily_leads"]', 'current_month', 1),
('accounts', 'line', 'Revenue Trend', '["daily_revenue"]', 'last_30_days', 2),
('accounts', 'bar', 'Department Performance', '["daily_revenue"]', 'current_month', 3),

-- UV CRM Dashboard
('uv_crm', 'metric_card', 'Sales Performance', '["daily_sales", "daily_leads", "lead_conversion_rate"]', 'current_month', 1),
('uv_crm', 'line', 'Sales Trend', '["daily_sales"]', 'last_30_days', 2),
('uv_crm', 'progress', 'Monthly Target Progress', '["monthly_sales_target"]', 'current_month', 3),

-- Marketing Dashboard
('marketing', 'metric_card', 'Campaign Performance', '["cost_per_lead", "roas", "campaign_clicks"]', 'current_month', 1),
('marketing', 'line', 'Ad Spend vs Revenue', '["ad_spend", "daily_revenue"]', 'last_30_days', 2),

-- Workshop Dashboard
('workshop', 'metric_card', 'Service Performance', '["service_jobs", "service_revenue", "average_job_value"]', 'current_month', 1),
('workshop', 'bar', 'Daily Service Jobs', '["service_jobs"]', 'last_7_days', 2),

-- Leasing Dashboard
('leasing', 'metric_card', 'Leasing Performance', '["leasing_contracts", "leasing_revenue", "average_lease_value"]', 'current_month', 1),
('leasing', 'line', 'Contract Trend', '["leasing_contracts"]', 'last_30_days', 2)

ON CONFLICT DO NOTHING;

-- 8. CALCULATION FUNCTIONS

-- Function to calculate lead conversion rate
CREATE OR REPLACE FUNCTION calculate_lead_conversion_rate(target_date DATE)
RETURNS DECIMAL(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
    leads_count DECIMAL;
    sales_count DECIMAL;
    conversion_rate DECIMAL(5,2);
BEGIN
    -- Get leads for the date
    SELECT COALESCE(metric_value, 0) INTO leads_count
    FROM accounts_daily_inputs
    WHERE input_date = target_date 
    AND department = 'uv_crm' 
    AND metric_name = 'daily_leads';
    
    -- Get sales for the date
    SELECT COALESCE(metric_value, 0) INTO sales_count
    FROM accounts_daily_inputs
    WHERE input_date = target_date 
    AND department = 'uv_crm' 
    AND metric_name = 'daily_sales';
    
    -- Calculate conversion rate
    IF leads_count > 0 THEN
        conversion_rate := (sales_count / leads_count) * 100;
    ELSE
        conversion_rate := 0;
    END IF;
    
    -- Store the calculation
    INSERT INTO accounts_calculations (calculation_date, department, metric_name, calculated_value, calculation_formula, source_metrics)
    VALUES (
        target_date,
        'uv_crm',
        'lead_conversion_rate',
        conversion_rate,
        '(daily_sales / daily_leads) * 100',
        jsonb_build_object('daily_leads', leads_count, 'daily_sales', sales_count)
    )
    ON CONFLICT (calculation_date, department, metric_name)
    DO UPDATE SET
        calculated_value = conversion_rate,
        source_metrics = jsonb_build_object('daily_leads', leads_count, 'daily_sales', sales_count);
    
    RETURN conversion_rate;
END $$;

-- 9. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_daily_inputs_date_dept ON accounts_daily_inputs(input_date, department);
CREATE INDEX IF NOT EXISTS idx_calculations_date_dept ON accounts_calculations(calculation_date, department);
CREATE INDEX IF NOT EXISTS idx_targets_dept_period ON accounts_targets(department, period_date);

-- 10. ROW LEVEL SECURITY
ALTER TABLE accounts_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_daily_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_dashboard_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_metric_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only see data if they have accounts module permissions
CREATE POLICY "accounts_targets_policy" ON accounts_targets FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid()) 
        WHERE module_name = 'accounts' AND can_view = true
    )
);

CREATE POLICY "accounts_daily_inputs_policy" ON accounts_daily_inputs FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid()) 
        WHERE module_name = 'accounts' AND can_view = true
    )
);

CREATE POLICY "accounts_calculations_policy" ON accounts_calculations FOR ALL USING (
    EXISTS (
        SELECT 1 FROM get_user_module_permissions(auth.uid()) 
        WHERE module_name = 'accounts' AND can_view = true
    )
);

CREATE POLICY "dashboard_configs_policy" ON accounts_dashboard_configs FOR SELECT USING (true);
CREATE POLICY "metric_definitions_policy" ON accounts_metric_definitions FOR SELECT USING (true);

SELECT 'Accounts Business Intelligence system created successfully!' as status; 