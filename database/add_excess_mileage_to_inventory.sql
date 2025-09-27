-- Add excess_mileage_charges field to leasing_inventory table
-- This allows setting excess mileage charges per vehicle in inventory

ALTER TABLE leasing_inventory ADD COLUMN IF NOT EXISTS excess_mileage_charges NUMERIC(10,2);

-- Add comment for clarity
COMMENT ON COLUMN leasing_inventory.excess_mileage_charges IS 'Excess mileage charges (AED per km) for this vehicle';

-- Create index for the new field
CREATE INDEX IF NOT EXISTS idx_leasing_inventory_excess_mileage ON leasing_inventory(excess_mileage_charges);

-- Verify the field was added
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
    AND column_name = 'excess_mileage_charges'
    AND table_schema = 'public';

-- Success message
SELECT 'excess_mileage_charges field added to leasing_inventory table!' as result;

