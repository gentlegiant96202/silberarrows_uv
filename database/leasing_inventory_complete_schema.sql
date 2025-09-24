-- =====================================================
-- COMPLETE LEASING INVENTORY TABLE - COMPREHENSIVE MODAL FIELDS
-- =====================================================
-- This schema includes ALL fields from AddVehicleModal.tsx
-- Analyzed from modal form state and all 6 tabs

-- Clean up first - Drop table and dependent objects
DROP TABLE IF EXISTS leasing_inventory CASCADE;

-- Drop existing ENUM types if they exist
DROP TYPE IF EXISTS leasing_vehicle_status_enum CASCADE;
DROP TYPE IF EXISTS in_out_status_enum CASCADE;
DROP TYPE IF EXISTS vehicle_category_enum CASCADE;
DROP TYPE IF EXISTS vehicle_condition_enum CASCADE;
DROP TYPE IF EXISTS regional_specification_enum CASCADE;
DROP TYPE IF EXISTS fuel_type_enum CASCADE;
DROP TYPE IF EXISTS transmission_enum CASCADE;

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

-- Create ENUM for vehicle condition
CREATE TYPE vehicle_condition_enum AS ENUM (
    'excellent',
    'good',
    'fair',
    'needs_attention'
);

-- Create ENUM for regional specification
CREATE TYPE regional_specification_enum AS ENUM (
    'GCC',
    'USA',
    'EUROPE',
    'JAPAN'
);

-- Create ENUM for fuel type
CREATE TYPE fuel_type_enum AS ENUM (
    'Petrol',
    'Diesel',
    'Hybrid',
    'Electric'
);

-- Create ENUM for transmission type
CREATE TYPE transmission_enum AS ENUM (
    'Automatic',
    'Manual',
    'CVT',
    'Semi-Automatic'
);

-- =====================================================
-- COMPREHENSIVE LEASING INVENTORY TABLE
-- =====================================================
CREATE TABLE leasing_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== VEHICLE IDENTIFICATION (Chassis Tab) =====
    stock_number TEXT NOT NULL UNIQUE,
    plate_number TEXT,                    -- UAE registration plate (50/28578)
    chassis_number TEXT,                  -- Full VIN/Chassis number (W1K3F8HB9PN313132)
    chassis_short TEXT,                   -- Short chassis (313132)
    engine_number TEXT,                   -- Engine identification (28291481004341)
    
    -- ===== VEHICLE BASIC DETAILS (Chassis Tab) =====
    make TEXT NOT NULL DEFAULT 'Mercedes-Benz',
    model TEXT,                           -- A, C, E, S, GLC, etc.
    vehicle_model TEXT,                   -- A 200 AMG HATCHBACK (specific variant)
    model_family TEXT,                    -- Model family grouping
    model_year INTEGER,
    category vehicle_category_enum,       -- A CLASS, C CLASS, etc.
    exterior_color TEXT,                  -- 191 BLACK, 149 WHITE, etc. (colour field)
    interior_color TEXT,                  -- interior_colour field
    body_style TEXT,                      -- Sedan, Hatchback, SUV, etc.
    
    -- ===== TECHNICAL SPECIFICATIONS (Chassis Tab) =====
    regional_specification regional_specification_enum DEFAULT 'GCC',
    engine TEXT,                          -- Engine type/description
    transmission transmission_enum DEFAULT 'Automatic',
    fuel_type fuel_type_enum DEFAULT 'Petrol',
    horsepower_hp INTEGER,                -- Engine power in HP
    torque_nm INTEGER,                    -- Engine torque in Nm
    cubic_capacity_cc INTEGER,            -- Engine displacement in CC
    
    -- ===== PURCHASE & ACQUISITION =====
    purchase_date DATE,                   -- When vehicle was acquired
    acquired_cost DECIMAL(12,2),          -- What you paid for vehicle
    
    -- ===== CURRENT STATUS & LOCATION =====
    status leasing_vehicle_status_enum NOT NULL DEFAULT 'marketing',
    in_out_status in_out_status_enum DEFAULT 'IN',
    current_customer_name TEXT,           -- Who has it leased
    current_customer_id UUID REFERENCES leasing_customers(id),
    current_parking_location TEXT DEFAULT 'Main Showroom',  -- YARD, CAR PARK, SHOWROOM 2, etc.
    location TEXT,                        -- General location field
    parking_spot TEXT,                    -- Specific parking spot
    
    -- ===== LEASE DATES & TERMS =====
    release_date_out DATE,               -- When current lease started
    expected_return_date DATE,           -- When current lease ends
    lease_to_own_option BOOLEAN DEFAULT FALSE,
    
    -- ===== PRICING & RATES (Pricing Tab) =====
    monthly_lease_rate DECIMAL(10,2),    -- Monthly lease amount
    security_deposit DECIMAL(10,2),      -- Security deposit amount
    daily_rate_customer DECIMAL(10,2),   -- Daily rate charged to customer
    daily_rate_vehicle DECIMAL(10,2),    -- Daily rate per vehicle
    planned_lease_pricing DECIMAL(10,2), -- Target lease amount
    lease_term_months INTEGER,           -- Lease term in months
    max_mileage_per_year INTEGER,        -- Maximum annual mileage
    buyout_price DECIMAL(10,2),          -- Customer purchase option
    
    -- ===== MILEAGE TRACKING =====
    current_mileage_km INTEGER,          -- Current odometer reading
    mylocator_mileage INTEGER,           -- MyLocatorPlus reading
    excess_mileage_whole_lease INTEGER DEFAULT 0,   -- Total excess for lease period
    excess_mileage_previous_billing INTEGER DEFAULT 0, -- Previous billing period excess
    
    -- ===== SERVICE TRACKING (Service Tab) =====
    first_service_date DATE,             -- 15,000 km / 1 yr service
    second_service_date DATE,            -- 30,000 km / 2 yrs service
    last_service_date DATE,              -- Most recent service
    next_service_due DATE,               -- When next service is due
    
    -- ===== VEHICLE CONDITION =====
    condition vehicle_condition_enum DEFAULT 'good',
    condition_notes TEXT,                -- Condition details
    
    -- ===== FINANCIAL TRACKING & DEPRECIATION =====
    monthly_depreciation DECIMAL(10,2),  -- Monthly depreciation amount
    excess_usage_depreciation DECIMAL(10,2) DEFAULT 0, -- Additional depreciation (.50)
    accumulated_depreciation DECIMAL(10,2) DEFAULT 0,  -- Total depreciation to date
    carrying_value DECIMAL(10,2),        -- Current book value (auto-calculated)
    current_market_value DECIMAL(10,2),  -- Current market value (1% less monthly)
    unrealized_gain_loss DECIMAL(10,2) DEFAULT 0,  -- Profit/loss calculation (auto-calculated)
    
    -- ===== COMPLIANCE & REGISTRATION =====
    warranty_expiry_date DATE,           -- Vehicle warranty expiration
    registration_date DATE,              -- UAE registration date
    months_registered INTEGER,           -- Months since registration
    insurance_expiry_date DATE,          -- Insurance expiration date
    
    -- ===== NOTES & DESCRIPTIONS (Details Tab) =====
    key_equipment TEXT,                  -- Key equipment and features
    description TEXT,                    -- Vehicle description/notes
    remarks TEXT,                        -- Special notes, accidents, renewals, etc.
    
    -- ===== CALCULATED FIELDS =====
    in_out_days INTEGER DEFAULT 0,       -- Days in current status (auto-calculated)
    in_out_months INTEGER DEFAULT 0,     -- Months in current status (auto-calculated)
    
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
CREATE INDEX idx_leasing_inventory_chassis ON leasing_inventory(chassis_number);
CREATE INDEX idx_leasing_inventory_stock ON leasing_inventory(stock_number);
CREATE INDEX idx_leasing_inventory_in_out ON leasing_inventory(in_out_status);
CREATE INDEX idx_leasing_inventory_return_date ON leasing_inventory(expected_return_date);
CREATE INDEX idx_leasing_inventory_make_model ON leasing_inventory(make, model);
CREATE INDEX idx_leasing_inventory_year ON leasing_inventory(model_year);
CREATE INDEX idx_leasing_inventory_category ON leasing_inventory(category);
CREATE INDEX idx_leasing_inventory_created_at ON leasing_inventory(created_at);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Function to calculate days/months in current status and financial metrics
CREATE OR REPLACE FUNCTION calculate_vehicle_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update timestamp
    NEW.updated_at = NOW();
    
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
    
    -- Auto-generate chassis_short from chassis_number (last 6 characters)
    IF NEW.chassis_number IS NOT NULL AND (NEW.chassis_short IS NULL OR NEW.chassis_short = '') THEN
        IF LENGTH(NEW.chassis_number) >= 6 THEN
            NEW.chassis_short = RIGHT(NEW.chassis_number, 6);
        END IF;
    END IF;
    
    -- Auto-generate stock_number from chassis_number if not provided (last 6 characters)
    IF NEW.chassis_number IS NOT NULL AND (NEW.stock_number IS NULL OR NEW.stock_number = '') THEN
        IF LENGTH(NEW.chassis_number) >= 6 THEN
            NEW.stock_number = RIGHT(NEW.chassis_number, 6);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_calculate_vehicle_metrics
    BEFORE INSERT OR UPDATE ON leasing_inventory
    FOR EACH ROW
    EXECUTE FUNCTION calculate_vehicle_metrics();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE leasing_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users" ON leasing_inventory
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- FIELD MAPPING SUMMARY
-- =====================================================
/*
COMPLETE FIELD MAPPING FROM AddVehicleModal.tsx:

FORM FIELD → DATABASE COLUMN:
✅ stock_number → stock_number
✅ plate_number → plate_number  
✅ chassis_number → chassis_number
✅ chassis_short → chassis_short
✅ engine_number → engine_number
✅ purchase_date → purchase_date
✅ model_year → model_year
✅ vehicle_model → vehicle_model
✅ model_family → model_family
✅ category → category
✅ colour → exterior_color
✅ interior_colour → interior_color
✅ body_style → body_style
✅ current_customer_name → current_customer_name
✅ current_parking_location → current_parking_location
✅ release_date_out → release_date_out
✅ expected_return_date → expected_return_date
✅ lease_to_own_option → lease_to_own_option
✅ daily_rate_customer → daily_rate_customer
✅ daily_rate_vehicle → daily_rate_vehicle
✅ planned_lease_pricing → planned_lease_pricing
✅ monthly_lease_rate → monthly_lease_rate
✅ security_deposit → security_deposit
✅ lease_term_months → lease_term_months
✅ max_mileage_per_year → max_mileage_per_year
✅ condition → condition
✅ condition_notes → condition_notes
✅ current_mileage_km → current_mileage_km
✅ mylocator_mileage → mylocator_mileage
✅ first_service_date → first_service_date
✅ second_service_date → second_service_date
✅ last_service_date → last_service_date
✅ next_service_due → next_service_due
✅ acquired_cost → acquired_cost
✅ monthly_depreciation → monthly_depreciation
✅ excess_usage_depreciation → excess_usage_depreciation
✅ accumulated_depreciation → accumulated_depreciation
✅ carrying_value → carrying_value (auto-calculated)
✅ buyout_price → buyout_price
✅ current_market_value → current_market_value
✅ unrealized_gain_loss → unrealized_gain_loss (auto-calculated)
✅ warranty_expiry_date → warranty_expiry_date
✅ registration_date → registration_date
✅ months_registered → months_registered
✅ regional_specification → regional_specification
✅ engine → engine
✅ transmission → transmission
✅ fuel_type → fuel_type
✅ horsepower_hp → horsepower_hp
✅ torque_nm → torque_nm
✅ cubic_capacity_cc → cubic_capacity_cc
✅ location → location
✅ parking_spot → parking_spot
✅ description → description
✅ key_equipment → key_equipment
✅ remarks → remarks
✅ insurance_expiry_date → insurance_expiry_date

MODAL TABS COVERED:
✅ Chassis Tab - Vehicle identification, basic details, technical specs
✅ Media Tab - Handled by separate car_media table
✅ Details Tab - Key equipment and description
✅ Pricing Tab - All leasing rates and financial terms
✅ Service Tab - Service history and insurance tracking
✅ Documents Tab - Handled by separate car_media table (documents)

AUTOMATIC CALCULATIONS:
✅ in_out_days and in_out_months from release_date_out
✅ carrying_value = acquired_cost - accumulated_depreciation
✅ unrealized_gain_loss = current_market_value - carrying_value
✅ Auto-generation of chassis_short and stock_number from chassis_number
✅ Updated_at timestamp on every change
*/
