-- Add 'reversed' status to vehicle_reservations
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing check constraint
ALTER TABLE vehicle_reservations 
DROP CONSTRAINT IF EXISTS vehicle_reservations_document_status_check;

-- Step 2: Add new check constraint with 'reversed' status
ALTER TABLE vehicle_reservations 
ADD CONSTRAINT vehicle_reservations_document_status_check 
CHECK (document_status IN ('pending', 'completed', 'cancelled', 'reversed'));

-- Verify the change
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%document_status%';

