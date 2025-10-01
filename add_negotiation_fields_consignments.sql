-- Add negotiation fields to consignments table
-- This allows detailed vehicle information and pricing options during negotiation

-- Add negotiation fields
ALTER TABLE consignments 
ADD COLUMN IF NOT EXISTS vehicle_make VARCHAR(100),
ADD COLUMN IF NOT EXISTS vehicle_year INTEGER,
ADD COLUMN IF NOT EXISTS mileage INTEGER,
ADD COLUMN IF NOT EXISTS vin VARCHAR(17),
ADD COLUMN IF NOT EXISTS direct_purchase_price INTEGER,
ADD COLUMN IF NOT EXISTS consignment_price INTEGER,
ADD COLUMN IF NOT EXISTS negotiation_notes TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_consignments_vehicle_make ON consignments(vehicle_make);
CREATE INDEX IF NOT EXISTS idx_consignments_vehicle_year ON consignments(vehicle_year);
CREATE INDEX IF NOT EXISTS idx_consignments_vin ON consignments(vin);

-- Add constraints
ALTER TABLE consignments 
ADD CONSTRAINT IF NOT EXISTS consignments_vehicle_year_check 
CHECK (vehicle_year IS NULL OR (vehicle_year >= 1900 AND vehicle_year <= 2030));

ALTER TABLE consignments 
ADD CONSTRAINT IF NOT EXISTS consignments_vin_length_check 
CHECK (vin IS NULL OR LENGTH(vin) = 17);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'consignments' 
AND column_name IN ('vehicle_make', 'vehicle_year', 'mileage', 'vin', 'direct_purchase_price', 'consignment_price', 'negotiation_notes')
ORDER BY column_name;

-- Show sample data
SELECT id, status, vehicle_make, vehicle_year, mileage, vin, direct_purchase_price, consignment_price 
FROM consignments 
ORDER BY created_at DESC 
LIMIT 3;
