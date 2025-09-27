-- =====================================================
-- ADD VEHICLE FIELDS TO LEASING CUSTOMERS TABLE
-- =====================================================
-- Add fields to store vehicle data when selected from inventory

-- Add vehicle information fields (copied from inventory when vehicle is selected)
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_model_year INTEGER;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_exterior_colour TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_interior_colour TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_monthly_lease_rate NUMERIC(10,2);
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_security_deposit NUMERIC(10,2);
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_buyout_price NUMERIC(10,2);
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_excess_mileage_charges NUMERIC(10,2);

-- Add comments for clarity
COMMENT ON COLUMN leasing_customers.vehicle_model_year IS 'Model year copied from inventory (e.g., 2023, 2024)';
COMMENT ON COLUMN leasing_customers.vehicle_model IS 'Vehicle model copied from inventory (e.g., A-Class, C-Class)';
COMMENT ON COLUMN leasing_customers.vehicle_exterior_colour IS 'Exterior colour copied from inventory (e.g., Black, White)';
COMMENT ON COLUMN leasing_customers.vehicle_interior_colour IS 'Interior colour copied from inventory (e.g., Black Leather)';
COMMENT ON COLUMN leasing_customers.vehicle_monthly_lease_rate IS 'Monthly lease rate (AED) copied from inventory';
COMMENT ON COLUMN leasing_customers.vehicle_security_deposit IS 'Security deposit (AED) copied from inventory';
COMMENT ON COLUMN leasing_customers.vehicle_buyout_price IS 'Buyout price (AED) copied from inventory';
COMMENT ON COLUMN leasing_customers.vehicle_excess_mileage_charges IS 'Excess mileage charges (AED per km) copied from inventory';

-- Create indexes for the new vehicle fields
CREATE INDEX IF NOT EXISTS idx_leasing_customers_vehicle_model_year ON leasing_customers(vehicle_model_year);
CREATE INDEX IF NOT EXISTS idx_leasing_customers_vehicle_model ON leasing_customers(vehicle_model);

-- =====================================================
-- FIELD MAPPING FROM INVENTORY TO CUSTOMERS
-- =====================================================
/*
INVENTORY TABLE FIELD → CUSTOMERS TABLE FIELD
model_year → vehicle_model_year
vehicle_model → vehicle_model  
colour → vehicle_exterior_colour
interior_colour → vehicle_interior_colour
monthly_lease_rate → vehicle_monthly_lease_rate
security_deposit → vehicle_security_deposit
buyout_price → vehicle_buyout_price
*/

-- Verify the new structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'leasing_customers' 
    AND column_name LIKE 'vehicle_%'
    AND table_schema = 'public'
ORDER BY column_name;

-- Success message
SELECT 'Vehicle fields added to leasing_customers table successfully!' as result;