-- Add contract data columns to existing lease_accounting table
-- Since you already have the table, this just adds the new JSONB columns

-- Add the new JSONB columns for contract data duplication
ALTER TABLE lease_accounting ADD COLUMN IF NOT EXISTS contract_data JSONB NULL;
ALTER TABLE lease_accounting ADD COLUMN IF NOT EXISTS vehicle_data JSONB NULL;
ALTER TABLE lease_accounting ADD COLUMN IF NOT EXISTS customer_data JSONB NULL;
ALTER TABLE lease_accounting ADD COLUMN IF NOT EXISTS documents JSONB NULL;
ALTER TABLE lease_accounting ADD COLUMN IF NOT EXISTS lease_modifications JSONB NULL;

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_lease_accounting_contract_data ON lease_accounting USING GIN (contract_data) WHERE contract_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_vehicle_data ON lease_accounting USING GIN (vehicle_data) WHERE vehicle_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_customer_data ON lease_accounting USING GIN (customer_data) WHERE customer_data IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN lease_accounting.contract_data IS 'Complete contract snapshot when moved to active lease - single source of truth';
COMMENT ON COLUMN lease_accounting.vehicle_data IS 'Vehicle details snapshot for the lease';
COMMENT ON COLUMN lease_accounting.customer_data IS 'Customer information snapshot';
COMMENT ON COLUMN lease_accounting.documents IS 'Array of document URLs and metadata';
COMMENT ON COLUMN lease_accounting.lease_modifications IS 'History of extensions, modifications, and terminations';

-- Success message
SELECT 'Contract data columns added to existing lease_accounting table!' as result;

