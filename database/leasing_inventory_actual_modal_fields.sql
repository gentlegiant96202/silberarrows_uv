-- =====================================================
-- LEASING INVENTORY TABLE - ACTUAL MODAL FIELDS ONLY
-- =====================================================
-- This schema includes ONLY the fields that actually exist in AddVehicleModal.tsx UI
-- Based on actual form inputs found in the modal (30 fields)

-- Clean up first - Drop table and dependent objects
DROP TABLE IF EXISTS leasing_inventory CASCADE;

-- Drop existing ENUM types if they exist
DROP TYPE IF EXISTS leasing_vehicle_status_enum CASCADE;
DROP TYPE IF EXISTS vehicle_category_enum CASCADE;
DROP TYPE IF EXISTS vehicle_condition_enum CASCADE;
DROP TYPE IF EXISTS fuel_type_enum CASCADE;

-- Create ENUM for vehicle status
CREATE TYPE leasing_vehicle_status_enum AS ENUM (
    'marketing',      -- Vehicle preparation stage
    'reserved',       -- Reserved for specific customer
    'leased',         -- Currently out on lease
    'returned',       -- Returned from lease, needs processing
    'maintenance',    -- In for service/repairs
    'archived'        -- End of life
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

-- Create ENUM for fuel type
CREATE TYPE fuel_type_enum AS ENUM (
    'Petrol',
    'Diesel',
    'Hybrid',
    'Electric'
);

-- =====================================================
-- LEASING INVENTORY TABLE - ACTUAL MODAL FIELDS
-- =====================================================
CREATE TABLE leasing_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== CHASSIS TAB FIELDS =====
    stock_number TEXT NOT NULL UNIQUE,
    chassis_number TEXT,                  -- Full chassis/VIN number
    model_year INTEGER,
    model_family TEXT,                    -- Mercedes model (A, C, E, S, GLC, etc.)
    vehicle_model TEXT,                   -- Specific variant (C-Class, etc.)
    colour TEXT,                          -- Exterior color (Obsidian Black, etc.)
    interior_colour TEXT,                 -- Interior color (Black Leather, etc.)
    plate_number TEXT,                    -- License plate (ABC123)
    engine_number TEXT,                   -- Engine identification number
    regional_specification TEXT DEFAULT 'GCC', -- Regional spec
    current_mileage_km INTEGER,           -- Current odometer reading
    body_style TEXT,                      -- Sedan, Hatchback, SUV, etc.
    category vehicle_category_enum,       -- A CLASS, C CLASS, etc.
    cubic_capacity_cc INTEGER,            -- Engine displacement in CC
    horsepower_hp INTEGER,                -- Engine power in HP
    torque_nm INTEGER,                    -- Engine torque in Nm
    fuel_type TEXT DEFAULT 'Petrol',      -- Fuel type
    current_parking_location TEXT DEFAULT 'Main Showroom', -- Where vehicle is parked
    
    -- ===== PRICING TAB FIELDS =====
    monthly_lease_rate DECIMAL(10,2),     -- Monthly lease amount
    security_deposit DECIMAL(10,2),       -- Security deposit amount
    buyout_price DECIMAL(10,2),           -- Customer purchase option
    purchase_date DATE,                   -- When vehicle was acquired
    acquired_cost DECIMAL(12,2),          -- What you paid for vehicle
    monthly_depreciation DECIMAL(10,2),   -- Monthly depreciation amount
    
    -- ===== SERVICE TAB FIELDS =====
    insurance_expiry_date DATE,           -- Insurance expiration date
    first_service_date DATE,              -- First service date
    second_service_date DATE,             -- Second service date
    warranty_expiry_date DATE,            -- Vehicle warranty expiration
    registration_date DATE,               -- UAE registration date
    
    -- ===== DETAILS TAB FIELDS =====
    key_equipment TEXT,                   -- Key equipment and features
    description TEXT,                     -- Vehicle description/notes
    
    -- ===== SYSTEM FIELDS =====
    make TEXT NOT NULL DEFAULT 'Mercedes-Benz', -- Always Mercedes-Benz
    status leasing_vehicle_status_enum NOT NULL DEFAULT 'marketing',
    condition vehicle_condition_enum DEFAULT 'good',
    
    -- ===== AUDIT FIELDS =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_leasing_inventory_status ON leasing_inventory(status);
CREATE INDEX idx_leasing_inventory_stock ON leasing_inventory(stock_number);
CREATE INDEX idx_leasing_inventory_plate ON leasing_inventory(plate_number);
CREATE INDEX idx_leasing_inventory_make_model ON leasing_inventory(make, model_family);
CREATE INDEX idx_leasing_inventory_year ON leasing_inventory(model_year);
CREATE INDEX idx_leasing_inventory_category ON leasing_inventory(category);
CREATE INDEX idx_leasing_inventory_created_at ON leasing_inventory(created_at);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC CALCULATIONS
-- =====================================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_timestamp
    BEFORE UPDATE ON leasing_inventory
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE leasing_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all operations for authenticated users" ON leasing_inventory
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- ACTUAL MODAL FIELD MAPPING SUMMARY
-- =====================================================
/*
CONFIRMED FIELDS FROM AddVehicleModal.tsx UI:

CHASSIS TAB (17 fields):
✅ stock_number
✅ model_year
✅ model_family
✅ vehicle_model
✅ colour → exterior_color
✅ interior_colour
✅ plate_number
✅ engine_number
✅ regional_specification
✅ current_mileage_km
✅ body_style
✅ category
✅ cubic_capacity_cc
✅ horsepower_hp
✅ torque_nm
✅ fuel_type
✅ current_parking_location

PRICING TAB (6 fields):
✅ monthly_lease_rate
✅ security_deposit
✅ buyout_price
✅ purchase_date
✅ acquired_cost
✅ monthly_depreciation

SERVICE TAB (5 fields):
✅ insurance_expiry_date
✅ first_service_date
✅ second_service_date
✅ warranty_expiry_date
✅ registration_date

DETAILS TAB (2 fields):
✅ key_equipment
✅ description

TOTAL: 30 actual form fields
MEDIA TAB: Handled by car_media table
DOCUMENTS TAB: Handled by car_media table

REMOVED FIELDS (not in actual modal):
❌ lease_to_own_option - not in UI
❌ daily_rate_customer - not in UI
❌ daily_rate_vehicle - not in UI
❌ planned_lease_pricing - not in UI
❌ lease_term_months - not in UI
❌ max_mileage_per_year - not in UI
❌ mylocator_mileage - not in UI
❌ last_service_date - not in UI
❌ next_service_due - not in UI
❌ excess_usage_depreciation - not in UI
❌ accumulated_depreciation - not in UI
❌ carrying_value - not in UI
❌ current_market_value - not in UI
❌ unrealized_gain_loss - not in UI
❌ months_registered - not in UI
❌ chassis_number - not in UI (uses stock_number)
❌ chassis_short - not in UI
❌ transmission - not in UI
❌ location - not in UI
❌ parking_spot - not in UI
❌ remarks - not in UI
*/

