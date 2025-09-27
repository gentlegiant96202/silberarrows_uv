-- Safe migration that checks field existence before updating
-- This prevents errors if field names are different in your leasing_inventory table

-- Step 1: Add vehicle fields to leasing_customers table
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_make TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_year INTEGER;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_color TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_vin TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_registration TEXT;
ALTER TABLE leasing_customers ADD COLUMN IF NOT EXISTS vehicle_mileage INTEGER;

-- Step 2: Add contract data columns to lease_accounting table
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

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_leasing_customers_vehicle_make ON leasing_customers(vehicle_make);
CREATE INDEX IF NOT EXISTS idx_leasing_customers_vehicle_model ON leasing_customers(vehicle_model);
CREATE INDEX IF NOT EXISTS idx_leasing_customers_vehicle_year ON leasing_customers(vehicle_year);

CREATE INDEX IF NOT EXISTS idx_lease_accounting_contract_data ON lease_accounting USING GIN (contract_data) WHERE contract_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_vehicle_data ON lease_accounting USING GIN (vehicle_data) WHERE vehicle_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_customer_data ON lease_accounting USING GIN (customer_data) WHERE customer_data IS NOT NULL;

-- Step 4: Add unique constraint to prevent duplicate contract data
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_contract_data_per_lease 
ON lease_accounting (lease_id) 
WHERE contract_data IS NOT NULL;

-- Step 5: Try to update existing customers with vehicle data (safe approach)
-- This will only work if the fields exist in leasing_inventory
DO $$ 
DECLARE
    vehicle_model_field TEXT;
    model_year_field TEXT;
BEGIN
    -- Check if vehicle_model field exists
    SELECT column_name INTO vehicle_model_field
    FROM information_schema.columns 
    WHERE table_name = 'leasing_inventory' 
    AND column_name IN ('vehicle_model', 'model')
    LIMIT 1;
    
    -- Check if model_year field exists  
    SELECT column_name INTO model_year_field
    FROM information_schema.columns 
    WHERE table_name = 'leasing_inventory' 
    AND column_name IN ('model_year', 'year')
    LIMIT 1;
    
    -- Only update if we found the fields
    IF vehicle_model_field IS NOT NULL AND model_year_field IS NOT NULL THEN
        EXECUTE format('
            UPDATE leasing_customers 
            SET 
                vehicle_make = vi.make,
                vehicle_model = vi.%I,
                vehicle_year = vi.%I
            FROM leasing_inventory vi
            WHERE leasing_customers.selected_vehicle_id = vi.id
            AND leasing_customers.vehicle_make IS NULL',
            vehicle_model_field, model_year_field);
    END IF;
END $$;

-- Step 6: Add comments for documentation
COMMENT ON COLUMN leasing_customers.vehicle_make IS 'Vehicle make - copied from selected vehicle for single source of truth';
COMMENT ON COLUMN leasing_customers.vehicle_model IS 'Vehicle model - copied from selected vehicle for single source of truth';
COMMENT ON COLUMN leasing_customers.vehicle_year IS 'Vehicle year - copied from selected vehicle for single source of truth';

-- Success message
SELECT 'Safe vehicle fields migration completed successfully!' as result;

