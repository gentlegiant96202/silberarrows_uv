-- =====================================================
-- ADD MISSING CHASSIS_NUMBER COLUMN
-- =====================================================
-- The modal is trying to save chassis_number but the column doesn't exist

-- Check if chassis_number column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
AND column_name = 'chassis_number';

-- Add chassis_number column if it doesn't exist
ALTER TABLE leasing_inventory 
ADD COLUMN IF NOT EXISTS chassis_number TEXT;

-- Create index on chassis_number for performance
CREATE INDEX IF NOT EXISTS idx_leasing_inventory_chassis_number 
ON leasing_inventory(chassis_number);

-- Show updated table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
ORDER BY ordinal_position;
