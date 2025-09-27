-- Complete migration to add all vehicle fields to leasing_customers table
-- This enables storing vehicle details directly with customer records for single source of truth

-- Add all vehicle fields to leasing_customers table
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_make TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_color TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_vin TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_registration TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_mileage INTEGER;

-- Add contract data columns to lease_accounting table (if not already added)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'contract_data') THEN
        ALTER TABLE lease_accounting ADD COLUMN contract_data JSONB NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'vehicle_data') THEN
        ALTER TABLE lease_accounting ADD COLUMN vehicle_data JSONB NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'customer_data') THEN
        ALTER TABLE lease_accounting ADD COLUMN customer_data JSONB NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'documents') THEN
        ALTER TABLE lease_accounting ADD COLUMN documents JSONB NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'lease_accounting' AND column_name = 'lease_modifications') THEN
        ALTER TABLE lease_accounting ADD COLUMN lease_modifications JSONB NULL;
    END IF;
END $$;

-- Create indexes for the new vehicle fields
CREATE INDEX IF NOT EXISTS idx_leasing_customers_vehicle_make ON leasing_customers(vehicle_make);
CREATE INDEX IF NOT EXISTS idx_leasing_customers_vehicle_model ON leasing_customers(vehicle_model);
CREATE INDEX IF NOT EXISTS idx_leasing_customers_vehicle_year ON leasing_customers(vehicle_year);

-- Create indexes for the JSONB columns in lease_accounting
CREATE INDEX IF NOT EXISTS idx_lease_accounting_contract_data ON lease_accounting USING GIN (contract_data) WHERE contract_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_vehicle_data ON lease_accounting USING GIN (vehicle_data) WHERE vehicle_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_customer_data ON lease_accounting USING GIN (customer_data) WHERE customer_data IS NOT NULL;

-- Add unique constraint to prevent duplicate contract data records
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_contract_data_per_lease 
ON lease_accounting (lease_id) 
WHERE contract_data IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN leasing_customers.vehicle_make IS 'Vehicle make (e.g., Mercedes-Benz, BMW) - copied from selected vehicle';
COMMENT ON COLUMN leasing_customers.vehicle_model IS 'Vehicle model (e.g., A-Class, C-Class) - copied from selected vehicle';
COMMENT ON COLUMN leasing_customers.vehicle_year IS 'Vehicle year (e.g., 2023, 2024) - copied from selected vehicle';
COMMENT ON COLUMN leasing_customers.vehicle_color IS 'Vehicle color (e.g., Black, White) - copied from selected vehicle';
COMMENT ON COLUMN leasing_customers.vehicle_vin IS 'Vehicle VIN/Chassis number - copied from selected vehicle';
COMMENT ON COLUMN leasing_customers.vehicle_registration IS 'Vehicle registration/plate number - copied from selected vehicle';
COMMENT ON COLUMN leasing_customers.vehicle_mileage IS 'Vehicle mileage at lease start - copied from selected vehicle';

COMMENT ON COLUMN lease_accounting.contract_data IS 'Complete contract snapshot when moved to active lease - single source of truth';
COMMENT ON COLUMN lease_accounting.vehicle_data IS 'Vehicle details snapshot for the lease';
COMMENT ON COLUMN lease_accounting.customer_data IS 'Customer information snapshot';
COMMENT ON COLUMN lease_accounting.documents IS 'Array of document URLs and metadata';
COMMENT ON COLUMN lease_accounting.lease_modifications IS 'History of extensions, modifications, and terminations';

-- Update existing customer records with vehicle details from inventory (for existing data)
-- First check what fields exist in leasing_inventory, then update accordingly
UPDATE leasing_customers 
SET 
    vehicle_make = vi.make,
    vehicle_model = vi.vehicle_model, -- Use only vehicle_model field
    vehicle_year = vi.model_year      -- Use only model_year field
FROM leasing_inventory vi
WHERE leasing_customers.selected_vehicle_id = vi.id
AND leasing_customers.vehicle_make IS NULL;

-- Success message
SELECT 
    'Vehicle fields migration completed!' as message,
    COUNT(*) as customers_updated
FROM leasing_customers 
WHERE vehicle_make IS NOT NULL;
