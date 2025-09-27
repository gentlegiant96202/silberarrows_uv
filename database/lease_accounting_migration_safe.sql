-- Safe migration script for lease accounting
-- Run this in your Supabase SQL editor

-- Step 1: Create enum types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE charge_type_enum AS ENUM ('rental', 'salik', 'mileage', 'late_fee', 'fine');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE accounting_status_enum AS ENUM ('pending', 'invoiced', 'paid', 'overdue');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS lease_accounting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leasing_customers(id) ON DELETE CASCADE,
    billing_period DATE NOT NULL,
    charge_type charge_type_enum NOT NULL,
    quantity NUMERIC NULL,
    unit_price NUMERIC NULL,
    total_amount NUMERIC NOT NULL,
    comment TEXT NULL,
    invoice_id UUID NULL,
    payment_id UUID NULL,
    status accounting_status_enum NOT NULL DEFAULT 'pending',
    vat_applicable BOOLEAN NOT NULL DEFAULT true,
    account_closed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_amount CHECK (total_amount >= 0),
    CONSTRAINT valid_quantity CHECK (quantity IS NULL OR quantity >= 0),
    CONSTRAINT valid_unit_price CHECK (unit_price IS NULL OR unit_price >= 0)
);

-- Step 3: Add new JSONB columns (only if they don't exist)
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

-- Step 4: Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_lease_accounting_lease_id ON lease_accounting(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_accounting_billing_period ON lease_accounting(billing_period);
CREATE INDEX IF NOT EXISTS idx_lease_accounting_status ON lease_accounting(status);
CREATE INDEX IF NOT EXISTS idx_lease_accounting_invoice_id ON lease_accounting(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_payment_id ON lease_accounting(payment_id) WHERE payment_id IS NOT NULL;

-- Step 5: Create JSONB indexes (only after columns exist)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'lease_accounting' AND column_name = 'contract_data') THEN
        CREATE INDEX IF NOT EXISTS idx_lease_accounting_contract_data ON lease_accounting USING GIN (contract_data) WHERE contract_data IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'lease_accounting' AND column_name = 'vehicle_data') THEN
        CREATE INDEX IF NOT EXISTS idx_lease_accounting_vehicle_data ON lease_accounting USING GIN (vehicle_data) WHERE vehicle_data IS NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'lease_accounting' AND column_name = 'customer_data') THEN
        CREATE INDEX IF NOT EXISTS idx_lease_accounting_customer_data ON lease_accounting USING GIN (customer_data) WHERE customer_data IS NOT NULL;
    END IF;
END $$;

-- Step 6: Create helper functions
CREATE OR REPLACE FUNCTION get_billing_periods(lease_start_date DATE, months_ahead INTEGER DEFAULT 12)
RETURNS TABLE(period_start DATE, period_end DATE, billing_period DATE) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (lease_start_date + INTERVAL '1 month' * i)::DATE as period_start,
        (lease_start_date + INTERVAL '1 month' * (i + 1) - INTERVAL '1 day')::DATE as period_end,
        (lease_start_date + INTERVAL '1 month' * i)::DATE as billing_period
    FROM generate_series(0, months_ahead - 1) i;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lease_accounting_updated_at ON lease_accounting;
CREATE TRIGGER trg_lease_accounting_updated_at
    BEFORE UPDATE ON lease_accounting
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Enable RLS
ALTER TABLE lease_accounting ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS policy (drop existing if needed)
DROP POLICY IF EXISTS "Users can manage lease accounting for their organization" ON lease_accounting;
CREATE POLICY "Users can manage lease accounting for their organization" ON lease_accounting
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 10: Add comments for documentation
COMMENT ON COLUMN lease_accounting.contract_data IS 'Complete contract snapshot when moved to active lease - single source of truth';
COMMENT ON COLUMN lease_accounting.vehicle_data IS 'Vehicle details snapshot for the lease';
COMMENT ON COLUMN lease_accounting.customer_data IS 'Customer information snapshot';
COMMENT ON COLUMN lease_accounting.documents IS 'Array of document URLs and metadata';
COMMENT ON COLUMN lease_accounting.lease_modifications IS 'History of extensions, modifications, and terminations';

-- Success message
SELECT 'Lease accounting schema migration completed successfully!' as result;

