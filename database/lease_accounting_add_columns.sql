-- Alternative migration: Just add new columns to existing lease_accounting table
-- Use this if the table already exists and you just need the new contract data columns

-- Add contract data columns to existing lease_accounting table
DO $$ BEGIN
    -- Add contract_data column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'contract_data') THEN
        ALTER TABLE lease_accounting ADD COLUMN contract_data JSONB NULL;
    END IF;
    
    -- Add vehicle_data column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'vehicle_data') THEN
        ALTER TABLE lease_accounting ADD COLUMN vehicle_data JSONB NULL;
    END IF;
    
    -- Add customer_data column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'customer_data') THEN
        ALTER TABLE lease_accounting ADD COLUMN customer_data JSONB NULL;
    END IF;
    
    -- Add documents column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'documents') THEN
        ALTER TABLE lease_accounting ADD COLUMN documents JSONB NULL;
    END IF;
    
    -- Add lease_modifications column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'lease_modifications') THEN
        ALTER TABLE lease_accounting ADD COLUMN lease_modifications JSONB NULL;
    END IF;
END $$;

-- Add indexes for the new JSONB columns (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_lease_accounting_contract_data ON lease_accounting USING GIN (contract_data) WHERE contract_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_vehicle_data ON lease_accounting USING GIN (vehicle_data) WHERE vehicle_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_customer_data ON lease_accounting USING GIN (customer_data) WHERE customer_data IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN lease_accounting.contract_data IS 'Complete contract snapshot when moved to active lease - single source of truth';
COMMENT ON COLUMN lease_accounting.vehicle_data IS 'Vehicle details snapshot for the lease';
COMMENT ON COLUMN lease_accounting.customer_data IS 'Customer information snapshot';
COMMENT ON COLUMN lease_accounting.documents IS 'Array of document URLs and metadata';
COMMENT ON COLUMN lease_accounting.lease_modifications IS 'History of extensions, modifications, and terminations';

