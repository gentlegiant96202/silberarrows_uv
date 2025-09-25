-- =====================================================
-- LEASING TRANSACTIONS SYSTEM
-- =====================================================
-- This integrates with existing leasing_customers and leasing_inventory tables
-- to track all financial transactions for active leases

-- Create ENUM for transaction types
DO $$ BEGIN
    CREATE TYPE lease_transaction_type AS ENUM (
        'monthly_rental',
        'security_deposit',
        'excess_mileage',
        'salik_charges',
        'traffic_fine',
        'damage_charge',
        'late_fee',
        'insurance_excess',
        'maintenance_charge',
        'payment',
        'credit_note',
        'adjustment'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ENUM for transaction status
DO $$ BEGIN
    CREATE TYPE lease_transaction_status AS ENUM (
        'pending',
        'invoiced',
        'paid',
        'partially_paid',
        'overdue',
        'cancelled',
        'refunded'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- LEASE INVOICES TABLE (Created first to avoid FK issues)
-- =====================================================
CREATE TABLE IF NOT EXISTS lease_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== INVOICE REFERENCE =====
    lease_customer_id UUID NOT NULL REFERENCES leasing_customers(id),
    vehicle_id UUID REFERENCES leasing_inventory(id),
    
    -- ===== INVOICE DETAILS =====
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    billing_period_start DATE,
    billing_period_end DATE,
    
    -- ===== AMOUNTS =====
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal + vat_amount) STORED,
    
    -- ===== PAYMENT STATUS =====
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) GENERATED ALWAYS AS (subtotal + vat_amount - paid_amount) STORED,
    status lease_transaction_status NOT NULL DEFAULT 'pending',
    
    -- ===== PDF STORAGE =====
    pdf_url TEXT,
    
    -- ===== NOTES =====
    notes TEXT,
    
    -- ===== AUDIT FIELDS =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ,
    sent_to TEXT
);

-- =====================================================
-- LEASE TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lease_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== LEASE REFERENCE =====
    lease_customer_id UUID NOT NULL REFERENCES leasing_customers(id),
    vehicle_id UUID REFERENCES leasing_inventory(id),
    
    -- ===== TRANSACTION DETAILS =====
    transaction_type lease_transaction_type NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    description TEXT NOT NULL,
    
    -- ===== AMOUNTS =====
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount + vat_amount) STORED,
    
    -- ===== PAYMENT INFO =====
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount + vat_amount - paid_amount) STORED,
    
    -- ===== STATUS =====
    status lease_transaction_status NOT NULL DEFAULT 'pending',
    
    -- ===== SPECIFIC FIELDS FOR DIFFERENT CHARGES =====
    -- For excess mileage
    start_mileage INTEGER,
    end_mileage INTEGER,
    excess_km INTEGER,
    rate_per_km DECIMAL(10,2),
    
    -- For Salik
    salik_gate TEXT,
    salik_date DATE,
    salik_reference TEXT,
    
    -- For traffic fines
    fine_number TEXT,
    fine_date DATE,
    fine_location TEXT,
    fine_type TEXT,
    
    -- ===== INVOICE REFERENCE =====
    invoice_id UUID REFERENCES lease_invoices(id),
    invoice_number TEXT,
    
    -- ===== NOTES =====
    notes TEXT,
    
    -- ===== AUDIT FIELDS =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- LEASE PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS lease_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- ===== PAYMENT REFERENCE =====
    lease_customer_id UUID NOT NULL REFERENCES leasing_customers(id),
    invoice_id UUID REFERENCES lease_invoices(id),
    
    -- ===== PAYMENT DETAILS =====
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method TEXT, -- 'cash', 'bank_transfer', 'cheque', 'credit_card'
    payment_reference TEXT,
    
    -- ===== AMOUNTS =====
    amount DECIMAL(10,2) NOT NULL,
    
    -- ===== ALLOCATION =====
    allocated_amount DECIMAL(10,2) DEFAULT 0,
    unallocated_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount - allocated_amount) STORED,
    
    -- ===== BANK DETAILS =====
    bank_name TEXT,
    cheque_number TEXT,
    
    -- ===== NOTES =====
    notes TEXT,
    
    -- ===== AUDIT FIELDS =====
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    receipt_url TEXT
);

-- =====================================================
-- PAYMENT ALLOCATIONS TABLE (Links payments to transactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS lease_payment_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    payment_id UUID NOT NULL REFERENCES lease_payments(id),
    transaction_id UUID NOT NULL REFERENCES lease_transactions(id),
    
    allocated_amount DECIMAL(10,2) NOT NULL,
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    UNIQUE(payment_id, transaction_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_lease_transactions_customer ON lease_transactions(lease_customer_id);
CREATE INDEX IF NOT EXISTS idx_lease_transactions_vehicle ON lease_transactions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_lease_transactions_status ON lease_transactions(status);
CREATE INDEX IF NOT EXISTS idx_lease_transactions_type ON lease_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_lease_transactions_date ON lease_transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_lease_invoices_customer ON lease_invoices(lease_customer_id);
CREATE INDEX IF NOT EXISTS idx_lease_invoices_number ON lease_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_lease_invoices_status ON lease_invoices(status);
CREATE INDEX IF NOT EXISTS idx_lease_invoices_date ON lease_invoices(invoice_date);

CREATE INDEX IF NOT EXISTS idx_lease_payments_customer ON lease_payments(lease_customer_id);
CREATE INDEX IF NOT EXISTS idx_lease_payments_invoice ON lease_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_lease_payments_date ON lease_payments(payment_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE lease_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_payment_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view lease transactions" ON lease_transactions
    FOR SELECT USING (true);

CREATE POLICY "Users can manage lease transactions" ON lease_transactions
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view lease invoices" ON lease_invoices
    FOR SELECT USING (true);

CREATE POLICY "Users can manage lease invoices" ON lease_invoices
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view lease payments" ON lease_payments
    FOR SELECT USING (true);

CREATE POLICY "Users can manage lease payments" ON lease_payments
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view payment allocations" ON lease_payment_allocations
    FOR SELECT USING (true);

CREATE POLICY "Users can manage payment allocations" ON lease_payment_allocations
    FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to calculate total outstanding for a customer
CREATE OR REPLACE FUNCTION get_lease_outstanding_balance(customer_id UUID)
RETURNS DECIMAL AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(balance_amount) 
         FROM lease_transactions 
         WHERE lease_customer_id = customer_id 
         AND status NOT IN ('cancelled', 'paid')),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_lease_invoice_number()
RETURNS TEXT AS $$
DECLARE
    last_number INTEGER;
    new_number TEXT;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-L-(\d+)') AS INTEGER)), 0)
    INTO last_number
    FROM lease_invoices
    WHERE invoice_number LIKE 'INV-L-%';
    
    new_number := 'INV-L-' || LPAD((last_number + 1)::TEXT, 6, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lease_transactions_updated_at
    BEFORE UPDATE ON lease_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_invoices_updated_at
    BEFORE UPDATE ON lease_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_payments_updated_at
    BEFORE UPDATE ON lease_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
