-- Migration: Add unique constraint on phone_number to prevent duplicates
-- Run this on existing databases to add the constraint

-- First, remove any existing duplicates (keep the first occurrence)
DELETE FROM consignments 
WHERE id NOT IN (
    SELECT DISTINCT ON (phone_number) id 
    FROM consignments 
    WHERE phone_number IS NOT NULL
    ORDER BY phone_number, created_at ASC
);

-- Add unique constraint on phone_number
ALTER TABLE consignments 
ADD CONSTRAINT consignments_phone_number_unique 
UNIQUE (phone_number);

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'consignments'::regclass 
AND conname = 'consignments_phone_number_unique'; 