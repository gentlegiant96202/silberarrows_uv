-- =====================================================
-- LEASING INVENTORY TABLE
-- =====================================================
-- This table handles vehicle inventory specifically for leasing

-- Clean up first
DROP TABLE IF EXISTS leasing_inventory CASCADE;

-- Create ENUM for leasing inventory status
CREATE TYPE leasing_inventory_status_enum AS ENUM (
    'available',
    'reserved',
    'leased',
    'maintenance',
    'returned',
    'archived'
);

-- Create ENUM for vehicle condition
CREATE TYPE vehicle_condition_enum AS ENUM (
    'excellent',
    'good',
    'fair',
    'needs_attention'
);

-- =====================================================
-- LEASING INVENTORY TABLE
-- =====================================================
CREATE TABLE leasing_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== VEHICLE IDENTIFICATION =====
    stock_number TEXT NOT NULL UNIQUE,
    vin_number TEXT,
    chassis_number TEXT,
    
    -- ===== VEHICLE DETAILS =====
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    model_year INTEGER NOT NULL,
    body_style TEXT,
    exterior_color TEXT,
    interior_color TEXT,
    
    -- ===== ENGINE & SPECS =====
    engine_type TEXT,
    transmission TEXT,
    fuel_type TEXT,
    mileage_km INTEGER,
    
    -- ===== LEASING SPECIFIC =====
    monthly_lease_rate DECIMAL(10,2),
    security_deposit DECIMAL(10,2),
    lease_term_months INTEGER DEFAULT 24,
    max_mileage_per_year INTEGER DEFAULT 20000,
    
    -- ===== VEHICLE CONDITION =====
    condition vehicle_condition_enum DEFAULT 'good',
    condition_notes TEXT,
    last_service_date DATE,
    next_service_due DATE,
    
    -- ===== AVAILABILITY =====
    status leasing_inventory_status_enum NOT NULL DEFAULT 'available',
    available_from DATE DEFAULT CURRENT_DATE,
    reserved_until DATE,
    
    -- ===== CURRENT LEASE INFO =====
    current_customer_id UUID REFERENCES leasing_customers(id),
    lease_start_date DATE,
    lease_end_date DATE,
    
    -- ===== FINANCIAL =====
    acquisition_cost DECIMAL(10,2),
    depreciation_rate DECIMAL(5,2) DEFAULT 15.00, -- Percentage per year
    
    -- ===== LOCATION & TRACKING =====
    location TEXT DEFAULT 'Main Showroom',
    parking_spot TEXT,
    
    -- ===== INTERNAL TRACKING =====
    assigned_to UUID REFERENCES auth.users(id),
    notes TEXT,
    
    -- ===== AUDIT FIELDS =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_leasing_inventory_status ON leasing_inventory(status);
CREATE INDEX idx_leasing_inventory_make_model ON leasing_inventory(make, model);
CREATE INDEX idx_leasing_inventory_year ON leasing_inventory(model_year);
CREATE INDEX idx_leasing_inventory_available_from ON leasing_inventory(available_from);
CREATE INDEX idx_leasing_inventory_customer ON leasing_inventory(current_customer_id);
CREATE INDEX idx_leasing_inventory_created_at ON leasing_inventory(created_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE leasing_inventory ENABLE ROW LEVEL SECURITY;

-- Policy for leasing inventory - authenticated users can access all
CREATE POLICY "Enable all operations for authenticated users" ON leasing_inventory
    FOR ALL USING (auth.role() = 'authenticated');

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================
INSERT INTO leasing_inventory (
    stock_number,
    vin_number,
    make,
    model,
    model_year,
    body_style,
    exterior_color,
    interior_color,
    engine_type,
    transmission,
    fuel_type,
    mileage_km,
    monthly_lease_rate,
    security_deposit,
    lease_term_months,
    condition,
    status,
    available_from,
    acquisition_cost,
    location,
    notes
) VALUES 
(
    'LV001',
    'WDDGF4HB1DR123456',
    'Mercedes-Benz',
    'C-Class',
    2024,
    'Sedan',
    'Obsidian Black',
    'Black Leather',
    '2.0L Turbo',
    'Automatic',
    'Petrol',
    5000,
    2500.00,
    7500.00,
    36,
    'excellent',
    'available',
    CURRENT_DATE,
    180000.00,
    'Main Showroom',
    'Brand new vehicle, ready for lease'
),
(
    'LV002',
    'WDDGF4HB1DR789012',
    'Mercedes-Benz',
    'E-Class',
    2024,
    'Sedan',
    'Polar White',
    'Beige Leather',
    '2.0L Turbo',
    'Automatic',
    'Petrol',
    8000,
    3200.00,
    9600.00,
    24,
    'excellent',
    'reserved',
    CURRENT_DATE - INTERVAL '5 days',
    220000.00,
    'Main Showroom',
    'Reserved for customer approval'
),
(
    'LV003',
    'WDDGF4HB1DR345678',
    'Mercedes-Benz',
    'GLC',
    2023,
    'SUV',
    'Iridium Silver',
    'Black Artico',
    '2.0L Turbo',
    'Automatic',
    'Petrol',
    15000,
    2800.00,
    8400.00,
    48,
    'good',
    'leased',
    CURRENT_DATE - INTERVAL '30 days',
    200000.00,
    'Customer Location',
    'Currently leased, due back in 2027'
),
(
    'LV004',
    'WDDGF4HB1DR901234',
    'Mercedes-Benz',
    'A-Class',
    2022,
    'Hatchback',
    'Mountain Grey',
    'Black Fabric',
    '1.3L Turbo',
    'Automatic',
    'Petrol',
    25000,
    1800.00,
    5400.00,
    24,
    'good',
    'returned',
    CURRENT_DATE - INTERVAL '60 days',
    150000.00,
    'Service Center',
    'Recently returned, undergoing inspection'
);

-- =====================================================
-- SUMMARY
-- =====================================================
/*
This leasing inventory schema includes:

LEASING INVENTORY TABLE:
✅ Vehicle identification (stock number, VIN, chassis)
✅ Vehicle details (make, model, year, colors, specs)
✅ Leasing-specific pricing (monthly rate, security deposit, terms)
✅ Vehicle condition tracking
✅ Availability management
✅ Current lease tracking (linked to customers)
✅ Financial tracking (acquisition cost, depreciation)
✅ Location and parking management
✅ Status management (available, reserved, leased, etc.)

FEATURES:
✅ Proper indexes for performance
✅ Row Level Security enabled
✅ Sample data for testing
✅ Enum types for data consistency
✅ Foreign key relationships to customers
✅ Audit fields for compliance

STATUS FLOW:
available → reserved → leased → returned → available (cycle)
                                      ↓
                                  archived (end of life)
*/
