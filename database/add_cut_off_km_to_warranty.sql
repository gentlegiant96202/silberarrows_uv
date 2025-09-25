-- ================================
-- ADD CUT_OFF_KM TO WARRANTY CONTRACTS
-- ================================
-- This migration adds the cut_off_km field to warranty_contracts table
-- to match the service_contracts table structure and user requirements

-- 1. Add cut_off_km column to warranty_contracts
ALTER TABLE warranty_contracts 
ADD COLUMN IF NOT EXISTS cut_off_km TEXT;

-- 2. Add customer ID fields to warranty_contracts (if missing)
ALTER TABLE warranty_contracts 
ADD COLUMN IF NOT EXISTS customer_id_type TEXT;

ALTER TABLE warranty_contracts 
ADD COLUMN IF NOT EXISTS customer_id_number TEXT;

-- 3. Add exterior and interior colour fields (if missing)
ALTER TABLE warranty_contracts 
ADD COLUMN IF NOT EXISTS exterior_colour TEXT;

ALTER TABLE warranty_contracts 
ADD COLUMN IF NOT EXISTS interior_colour TEXT;

-- 4. Add invoice_amount field (if missing)
ALTER TABLE warranty_contracts 
ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10,2);

-- 5. Add workflow_status field (if missing)
ALTER TABLE warranty_contracts 
ADD COLUMN IF NOT EXISTS workflow_status TEXT DEFAULT 'active';

-- 6. Add reservation_id field (if missing)
ALTER TABLE warranty_contracts 
ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES vehicle_reservations(id);

-- 7. Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_warranty_contracts_cut_off_km ON warranty_contracts(cut_off_km);
CREATE INDEX IF NOT EXISTS idx_warranty_contracts_customer_id ON warranty_contracts(customer_id_type, customer_id_number);
CREATE INDEX IF NOT EXISTS idx_warranty_contracts_reservation ON warranty_contracts(reservation_id);

-- 8. Add comments for documentation
COMMENT ON COLUMN warranty_contracts.cut_off_km IS 'Maximum kilometers coverage for warranty (replaces coverage_details)';
COMMENT ON COLUMN warranty_contracts.customer_id_type IS 'Type of customer ID (Emirates ID, Passport, etc.)';
COMMENT ON COLUMN warranty_contracts.customer_id_number IS 'Customer ID number';
COMMENT ON COLUMN warranty_contracts.exterior_colour IS 'Vehicle exterior color';
COMMENT ON COLUMN warranty_contracts.interior_colour IS 'Vehicle interior color';
COMMENT ON COLUMN warranty_contracts.invoice_amount IS 'Warranty contract amount in AED';
COMMENT ON COLUMN warranty_contracts.workflow_status IS 'Current workflow status of the warranty contract';
COMMENT ON COLUMN warranty_contracts.reservation_id IS 'Link to vehicle reservation if created from reservation';

-- 9. Update existing records to have default values
UPDATE warranty_contracts 
SET cut_off_km = '20000' 
WHERE cut_off_km IS NULL;

UPDATE warranty_contracts 
SET workflow_status = 'active' 
WHERE workflow_status IS NULL;

-- 10. Success message
DO $$
BEGIN
    RAISE NOTICE 'Warranty contracts table updated successfully!';
    RAISE NOTICE 'Added fields: cut_off_km, customer_id_type, customer_id_number, exterior_colour, interior_colour, invoice_amount, workflow_status, reservation_id';
    RAISE NOTICE 'Existing records updated with default values';
END $$;
