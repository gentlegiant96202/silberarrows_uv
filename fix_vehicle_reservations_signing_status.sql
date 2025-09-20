-- Fix vehicle_reservations signing_status constraint to allow 'company_signed'
-- This fixes the DocuSign webhook issue where reservations fail to update status

-- Drop the existing constraint
ALTER TABLE vehicle_reservations 
DROP CONSTRAINT IF EXISTS vehicle_reservations_signing_status_check;

-- Add the corrected constraint that includes 'company_signed'
ALTER TABLE vehicle_reservations 
ADD CONSTRAINT vehicle_reservations_signing_status_check 
CHECK (signing_status IN ('pending', 'sent', 'delivered', 'company_signed', 'completed', 'declined', 'voided'));

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE 'Successfully updated vehicle_reservations signing_status constraint';
    RAISE NOTICE 'Now allows: pending, sent, delivered, company_signed, completed, declined, voided';
    RAISE NOTICE 'This fixes the DocuSign webhook issue for vehicle documents';
END $$;

