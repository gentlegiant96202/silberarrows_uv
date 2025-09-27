-- Create basic lease_accounting table first
-- Run this in Supabase SQL Editor to get started

-- Step 1: Create enum types (safe)
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

-- Step 2: Create basic table
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
    CONSTRAINT valid_amount CHECK (total_amount >= 0)
);

-- Step 3: Basic indexes
CREATE INDEX IF NOT EXISTS idx_lease_accounting_lease_id ON lease_accounting(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_accounting_status ON lease_accounting(status);

-- Step 4: Enable RLS
ALTER TABLE lease_accounting ENABLE ROW LEVEL SECURITY;

-- Step 5: Basic policy
DROP POLICY IF EXISTS "Users can manage lease accounting" ON lease_accounting;
CREATE POLICY "Users can manage lease accounting" ON lease_accounting
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Success message
SELECT 'Basic lease_accounting table created successfully!' as result;

