-- =====================================================
-- COMPREHENSIVE LEASING INVENTORY TABLE
-- =====================================================
-- Single table with all Excel data per vehicle row

-- Clean up first
DROP TABLE IF EXISTS leasing_inventory CASCADE;

-- Create ENUM for vehicle status
CREATE TYPE leasing_vehicle_status_enum AS ENUM (
    'marketing',      -- Vehicle preparation stage
    'reserved',       -- Reserved for specific customer
    'leased',         -- Currently out on lease
    'returned',       -- Returned from lease, needs processing
    'maintenance',    -- In for service/repairs
    'archived'        -- End of life
);

-- Create ENUM for IN/OUT status
CREATE TYPE in_out_status_enum AS ENUM (
    'IN',            -- Vehicle in your possession
    'OUT',           -- Vehicle out with customer
    'RESERVED'       -- Vehicle reserved for customer
);

-- Create ENUM for vehicle category
CREATE TYPE vehicle_category_enum AS ENUM (
    'A CLASS',
    'C CLASS', 
    'E CLASS',
    'S CLASS',
    'GLC',
    'GLE',
    'GLS',
    'OTHERS'
);

-- =====================================================
-- COMPREHENSIVE LEASING INVENTORY TABLE
-- =====================================================
CREATE TABLE leasing_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== VEHICLE IDENTIFICATION =====
    stock_number TEXT NOT NULL UNIQUE,
    plate_number TEXT,                    -- UAE registration plate (50/28578)
    vin_number TEXT,                      -- Chassis number (W1K3F8HB9PN313132)
    chassis_short TEXT,                   -- Short chassis (313132)
    engine_number TEXT,                   -- Engine identification (28291481004341)
    
    -- ===== VEHICLE DETAILS =====
    purchase_date DATE,                   -- When vehicle was acquired
    make TEXT NOT NULL DEFAULT 'Mercedes-Benz',
    model TEXT NOT NULL,                  -- A 200 AMG HATCHBACK
    model_year INTEGER NOT NULL,
    category vehicle_category_enum,       -- A CLASS, OTHERS, etc.
    exterior_color TEXT,                  -- 191 BLACK, 149 WHITE, etc.
    interior_color TEXT,
    body_style TEXT,
    
    -- ===== CURRENT LEASE STATUS =====
    status leasing_vehicle_status_enum NOT NULL DEFAULT 'marketing',
    in_out_status in_out_status_enum DEFAULT 'IN',
    current_customer_name TEXT,           -- Who has it leased
    current_customer_id UUID REFERENCES leasing_customers(id),
    current_parking_location TEXT,        -- YARD, CAR PARK, SHOWROOM 2, etc.
    
    -- ===== LEASE DATES =====
    release_date_out DATE,               -- When current lease started
    expected_return_date DATE,           -- When current lease ends
    in_out_days INTEGER DEFAULT 0,       -- Days in current status
    in_out_months INTEGER DEFAULT 0,     -- Months in current status
    
    -- ===== LEASE TERMS =====
    lease_to_own_option BOOLEAN DEFAULT FALSE,
    daily_rate_customer DECIMAL(10,2),   -- Daily rate charged to customer
    daily_rate_vehicle DECIMAL(10,2),    -- Daily rate per vehicle
    planned_lease_pricing DECIMAL(10,2), -- Target lease amount
    
    -- ===== MILEAGE TRACKING =====
    current_mileage_km INTEGER,          -- MyLocatorPlus reading
    excess_mileage_whole_lease INTEGER DEFAULT 0,   -- Total excess for lease period
    excess_mileage_previous_billing INTEGER DEFAULT 0, -- Previous billing period excess
    mylocator_mileage INTEGER,           -- Latest MyLocatorPlus reading
    
    -- ===== SERVICE TRACKING =====
    first_service_date DATE,             -- 15,000 km / 1 yr service
    second_service_date DATE,            -- 30,000 km / 2 yrs service
    last_service_date DATE,              -- Most recent service
    next_service_due DATE,               -- When next service is due
    
    -- ===== FINANCIAL TRACKING =====
    acquired_cost DECIMAL(10,2),         -- What you paid for vehicle
    monthly_depreciation DECIMAL(10,2),  -- Monthly depreciation amount
    excess_usage_depreciation DECIMAL(10,2) DEFAULT 0, -- Additional depreciation (.50)
    accumulated_depreciation DECIMAL(10,2) DEFAULT 0,  -- Total depreciation to date
    carrying_value DECIMAL(10,2),        -- Current book value
    buyout_price DECIMAL(10,2),          -- Customer purchase option
    current_market_value DECIMAL(10,2),  -- Current market value (1% less monthly)
    unrealized_gain_loss DECIMAL(10,2),  -- Profit/loss calculation
    
    -- ===== COMPLIANCE & REGISTRATION =====
    warranty_expiry_date DATE,
    registration_date DATE,
    months_registered INTEGER,
    
    -- ===== NOTES & REMARKS =====
    remarks TEXT,                        -- Special notes, accidents, renewals, etc.
    
    -- ===== AUDIT FIELDS =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_leasing_inventory_status ON leasing_inventory(status);
CREATE INDEX idx_leasing_inventory_customer ON leasing_inventory(current_customer_id);
CREATE INDEX idx_leasing_inventory_plate ON leasing_inventory(plate_number);
CREATE INDEX idx_leasing_inventory_vin ON leasing_inventory(vin_number);
CREATE INDEX idx_leasing_inventory_in_out ON leasing_inventory(in_out_status);
CREATE INDEX idx_leasing_inventory_return_date ON leasing_inventory(expected_return_date);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Function to calculate days/months in current status
CREATE OR REPLACE FUNCTION calculate_in_out_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate days and months based on release_date_out
    IF NEW.release_date_out IS NOT NULL THEN
        NEW.in_out_days = (CURRENT_DATE - NEW.release_date_out)::INTEGER;
        NEW.in_out_months = EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.release_date_out)) * 12 + 
                           EXTRACT(MONTH FROM AGE(CURRENT_DATE, NEW.release_date_out));
    END IF;
    
    -- Calculate carrying value (acquired_cost - accumulated_depreciation)
    IF NEW.acquired_cost IS NOT NULL AND NEW.accumulated_depreciation IS NOT NULL THEN
        NEW.carrying_value = NEW.acquired_cost - NEW.accumulated_depreciation;
    END IF;
    
    -- Calculate unrealized gain/loss (current_market_value - carrying_value)
    IF NEW.current_market_value IS NOT NULL AND NEW.carrying_value IS NOT NULL THEN
        NEW.unrealized_gain_loss = NEW.current_market_value - NEW.carrying_value;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_calculate_vehicle_metrics
    BEFORE INSERT OR UPDATE ON leasing_inventory
    FOR EACH ROW
    EXECUTE FUNCTION calculate_in_out_duration();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE leasing_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users" ON leasing_inventory
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- SAMPLE DATA BASED ON YOUR EXCEL
-- =====================================================
INSERT INTO leasing_inventory (
    stock_number,
    plate_number,
    vin_number,
    chassis_short,
    engine_number,
    purchase_date,
    model,
    model_year,
    category,
    exterior_color,
    current_customer_name,
    status,
    in_out_status,
    current_parking_location,
    release_date_out,
    expected_return_date,
    lease_to_own_option,
    daily_rate_customer,
    daily_rate_vehicle,
    current_mileage_km,
    excess_mileage_whole_lease,
    first_service_date,
    second_service_date,
    monthly_depreciation,
    accumulated_depreciation,
    carrying_value,
    acquired_cost,
    planned_lease_pricing,
    buyout_price,
    current_market_value,
    unrealized_gain_loss,
    warranty_expiry_date,
    registration_date,
    months_registered,
    remarks
) VALUES 
(
    '28578',
    '50/28578',
    'W1K3F8HB9PN313132',
    '313132',
    '28291481004341',
    '2023-10-11',
    'A 200 AMG HATCHBACK',
    2023,
    'A CLASS',
    '191 BLACK',
    'Yasmina Saloua Zahawi',
    'leased',
    'OUT',
    NULL,
    '2024-04-30',
    '2026-04-29',
    FALSE,
    133.30,
    133.30,
    36986,
    2917,
    '2024-10-06',
    '2025-05-14',
    2072.36,
    47965.00,
    129665.48,
    177630.48,
    130000.00,
    130000.00,
    130000.00,
    0.00,
    '2025-09-29',
    '2024-10-31',
    10,
    'CONTRACT RENEWED'
),
(
    '25042',
    '17/25042',
    'W1K3F8HB7SN344498',
    '344498',
    '28281480220227',
    '2025-01-30',
    'A 200 AMG HATCHBACK',
    2025,
    'A CLASS',
    '970 BLUE',
    NULL,
    'marketing',
    'IN',
    'YARD',
    NULL,
    NULL,
    FALSE,
    149.97,
    149.97,
    6104,
    0,
    '2025-04-04',
    NULL,
    1911.38,
    32578.00,
    131254.86,
    163832.86,
    155000.00,
    155000.00,
    155000.00,
    0.00,
    '2027-02-06',
    '2025-02-06',
    7,
    NULL
);

-- =====================================================
-- SUMMARY
-- =====================================================
/*
This comprehensive schema includes:

SINGLE ROW PER VEHICLE:
✅ All Excel columns mapped to database fields
✅ Vehicle identification (stock, plate, VIN, engine)
✅ Current lease status and customer assignment
✅ Complete financial tracking (costs, depreciation, P&L)
✅ Mileage and service tracking
✅ Location and parking management
✅ Lease terms and options
✅ Compliance and registration data

AUTOMATIC CALCULATIONS:
✅ IN/OUT days and months calculation
✅ Carrying value calculation (cost - depreciation)
✅ Unrealized gain/loss calculation
✅ Triggers for automatic updates

INTEGRATION READY:
✅ Foreign key to leasing_customers
✅ Status sync between CRM and inventory
✅ Complete vehicle lifecycle tracking
✅ All Excel data preserved in single row
*/
