-- Add notes field to vehicle_reservations table
-- Migration: Add additional_notes column for reservation and invoice documents

-- Add the additional_notes column
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS additional_notes TEXT DEFAULT '';

-- Add comment for documentation
COMMENT ON COLUMN vehicle_reservations.additional_notes IS 'Additional notes for reservation/invoice document - visible on first page';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'vehicle_reservations' 
AND column_name = 'additional_notes';

-- Show success message
DO $$
BEGIN
    RAISE NOTICE 'Successfully added additional_notes column to vehicle_reservations table';
END $$; 