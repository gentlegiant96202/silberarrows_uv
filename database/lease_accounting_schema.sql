-- Lease Accounting System Schema
-- Single table approach as requested - keeps everything in one table for simplicity

-- Create enum types (only if they don't exist)
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

-- Single lease accounting table that handles everything
CREATE TABLE IF NOT EXISTS lease_accounting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leasing_customers(id) ON DELETE CASCADE,
    
    -- Billing period (monthly, tied to lease start date)
    billing_period DATE NOT NULL,
    
    -- Charge details
    charge_type charge_type_enum NOT NULL,
    quantity NUMERIC NULL, -- For salik count, mileage km, etc.
    unit_price NUMERIC NULL, -- Price per unit
    total_amount NUMERIC NOT NULL, -- Final amount (quantity × unit_price or flat amount)
    comment TEXT NULL,
    
    -- Invoice and payment linking (UUIDs to group related records)
    invoice_id UUID NULL, -- Groups charges into invoices
    payment_id UUID NULL, -- Links to payment when paid
    
    -- Status and settings
    status accounting_status_enum NOT NULL DEFAULT 'pending',
    vat_applicable BOOLEAN NOT NULL DEFAULT true,
    account_closed BOOLEAN NOT NULL DEFAULT false,
    
    -- Contract data duplication (single source of truth for active leases)
    contract_data JSONB NULL, -- Complete contract snapshot when moved to active lease
    vehicle_data JSONB NULL,  -- Vehicle details snapshot
    customer_data JSONB NULL, -- Customer info snapshot  
    documents JSONB NULL,     -- Array of document URLs and metadata
    lease_modifications JSONB NULL, -- History of extensions, modifications, terminations
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints for data integrity
    CONSTRAINT valid_amount CHECK (total_amount >= 0),
    CONSTRAINT valid_quantity CHECK (quantity IS NULL OR quantity >= 0),
    CONSTRAINT valid_unit_price CHECK (unit_price IS NULL OR unit_price >= 0)
);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_lease_accounting_lease_id ON lease_accounting(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_accounting_billing_period ON lease_accounting(billing_period);
CREATE INDEX IF NOT EXISTS idx_lease_accounting_status ON lease_accounting(status);
CREATE INDEX IF NOT EXISTS idx_lease_accounting_invoice_id ON lease_accounting(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_payment_id ON lease_accounting(payment_id) WHERE payment_id IS NOT NULL;

-- Indexes for contract data queries
CREATE INDEX IF NOT EXISTS idx_lease_accounting_contract_data ON lease_accounting USING GIN (contract_data) WHERE contract_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_vehicle_data ON lease_accounting USING GIN (vehicle_data) WHERE vehicle_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lease_accounting_customer_data ON lease_accounting USING GIN (customer_data) WHERE customer_data IS NOT NULL;

-- Function to calculate billing periods based on lease start date
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

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lease_accounting_updated_at
    BEFORE UPDATE ON lease_accounting
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE lease_accounting ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can manage lease accounting for their organization" ON lease_accounting
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Sample data for testing (optional)
-- INSERT INTO lease_accounting (lease_id, billing_period, charge_type, total_amount, comment)
-- VALUES 
--     ('lease-uuid-here', '2024-01-10', 'rental', 2500.00, 'Monthly rental payment'),
--     ('lease-uuid-here', '2024-01-10', 'salik', 20.00, '4 salik charges at 5 AED each');