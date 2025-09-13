-- Add separate exterior and interior color fields to vehicle_reservations table
-- This supports the updated VehicleDocumentModal that uses separate color fields

-- Add the new color columns
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS vehicle_exterior_colour TEXT,
ADD COLUMN IF NOT EXISTS vehicle_interior_colour TEXT,
ADD COLUMN IF NOT EXISTS part_exchange_exterior_colour TEXT;

-- Copy existing data from single color fields to exterior color fields
UPDATE vehicle_reservations 
SET vehicle_exterior_colour = vehicle_colour 
WHERE vehicle_exterior_colour IS NULL AND vehicle_colour IS NOT NULL;

UPDATE vehicle_reservations 
SET part_exchange_exterior_colour = part_exchange_colour 
WHERE part_exchange_exterior_colour IS NULL AND part_exchange_colour IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN vehicle_reservations.vehicle_exterior_colour IS 'Vehicle exterior color (replaces single vehicle_colour field)';
COMMENT ON COLUMN vehicle_reservations.vehicle_interior_colour IS 'Vehicle interior color (new field)';
COMMENT ON COLUMN vehicle_reservations.part_exchange_exterior_colour IS 'Part exchange vehicle exterior color (replaces part_exchange_colour)';

-- Show the updated schema
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'vehicle_reservations' 
    AND column_name LIKE '%colour%'
ORDER BY column_name;

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added separate exterior/interior color fields to vehicle_reservations table';
END $$;