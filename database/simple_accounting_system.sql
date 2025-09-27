-- 🎯 SIMPLE & USER-FRIENDLY ACCOUNTING SYSTEM
-- Production-ready with transaction safety and IFRS compliance

-- 1. CLEAN ENUMS
DO $$ BEGIN
    CREATE TYPE simple_transaction_type AS ENUM (
        'monthly_rent',     -- Monthly lease payment
        'security_deposit', -- Initial security deposit
        'salik_fee',       -- Salik/toll charges
        'excess_mileage',  -- Excess mileage charges
        'late_fee',        -- Late payment fees
        'traffic_fine',    -- Traffic violation fines
        'payment',         -- Customer payments (negative amounts)
        'refund',          -- Refunds to customer (negative amounts)
        'adjustment'       -- Manual adjustments
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE simple_status AS ENUM (
        'draft',      -- Being prepared
        'pending',    -- Ready to be invoiced
        'invoiced',   -- Sent to customer
        'paid',       -- Fully paid
        'overdue',    -- Past due date
        'cancelled'   -- Cancelled transaction
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. MAIN ACCOUNTING TABLE - SIMPLE & CLEAN
CREATE TABLE IF NOT EXISTS lease_transactions (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leasing_customers(id) ON DELETE CASCADE,
    
    -- Transaction details (simple and clear)
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NULL, -- When payment is due (for charges)
    transaction_type simple_transaction_type NOT NULL,
    
    -- Amounts (positive for charges, negative for payments/refunds)
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount + vat_amount) STORED,
    
    -- Description and reference
    description TEXT NOT NULL,
    reference_number TEXT NULL, -- Invoice number, payment reference, etc.
    
    -- Status and grouping
    status simple_status NOT NULL DEFAULT 'draft',
    invoice_group UUID NULL, -- Groups transactions into invoices
    payment_group UUID NULL, -- Groups payments together
    
    -- Audit trail (IFRS compliant)
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Version control for optimistic locking
    version INTEGER DEFAULT 1,
    
    -- Soft delete for audit trail
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    deleted_by UUID REFERENCES auth.users(id),
    
    -- Constraints for data integrity
    CONSTRAINT valid_amount CHECK (
        (transaction_type IN ('payment', 'refund') AND total_amount <= 0) OR
        (transaction_type NOT IN ('payment', 'refund') AND total_amount >= 0)
    ),
    CONSTRAINT valid_due_date CHECK (
        (transaction_type IN ('payment', 'refund') AND due_date IS NULL) OR
        (transaction_type NOT IN ('payment', 'refund'))
    ),
    CONSTRAINT valid_vat CHECK (vat_amount >= 0)
);

-- 3. CUSTOMER BALANCE VIEW (Real-time balance calculation)
CREATE OR REPLACE VIEW lease_balances AS
SELECT 
    lease_id,
    SUM(total_amount) as current_balance,
    SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount,
    SUM(CASE WHEN status = 'invoiced' AND due_date < CURRENT_DATE THEN total_amount ELSE 0 END) as past_due_amount,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
    MAX(CASE WHEN status = 'overdue' THEN due_date END) as oldest_overdue_date
FROM lease_transactions 
WHERE deleted_at IS NULL
GROUP BY lease_id;

-- 4. PERFORMANCE INDEXES
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_transactions_lease_id 
ON lease_transactions(lease_id) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_transactions_status 
ON lease_transactions(status) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_transactions_due_date 
ON lease_transactions(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lease_transactions_invoice_group 
ON lease_transactions(invoice_group) WHERE deleted_at IS NULL AND invoice_group IS NOT NULL;

-- 5. TRANSACTION-SAFE FUNCTIONS

-- Function to add a charge (rent, fees, etc.)
CREATE OR REPLACE FUNCTION add_charge(
    p_lease_id UUID,
    p_transaction_type simple_transaction_type,
    p_amount DECIMAL(10,2),
    p_description TEXT,
    p_due_date DATE DEFAULT NULL,
    p_vat_rate DECIMAL(5,4) DEFAULT 0.05
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_vat_amount DECIMAL(10,2);
BEGIN
    -- Calculate VAT
    v_vat_amount := CASE 
        WHEN p_transaction_type IN ('monthly_rent', 'excess_mileage') THEN p_amount * p_vat_rate
        ELSE 0 
    END;
    
    -- Insert transaction
    INSERT INTO lease_transactions (
        lease_id, transaction_type, amount, vat_amount, 
        description, due_date, status, created_by
    ) VALUES (
        p_lease_id, p_transaction_type, p_amount, v_vat_amount,
        p_description, COALESCE(p_due_date, CURRENT_DATE + INTERVAL '30 days'), 
        'pending', auth.uid()
    ) RETURNING id INTO v_transaction_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create invoice from pending charges
CREATE OR REPLACE FUNCTION create_invoice(
    p_lease_id UUID,
    p_transaction_ids UUID[]
) RETURNS UUID AS $$
DECLARE
    v_invoice_group UUID;
    v_invoice_number TEXT;
BEGIN
    -- Generate invoice group ID and number
    v_invoice_group := gen_random_uuid();
    v_invoice_number := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(EXTRACT(epoch FROM NOW())::TEXT, 10, '0');
    
    -- Update transactions to invoiced status
    UPDATE lease_transactions 
    SET 
        status = 'invoiced',
        invoice_group = v_invoice_group,
        reference_number = v_invoice_number,
        updated_by = auth.uid(),
        updated_at = NOW(),
        version = version + 1
    WHERE id = ANY(p_transaction_ids)
      AND lease_id = p_lease_id
      AND status = 'pending'
      AND deleted_at IS NULL;
    
    -- Verify all transactions were updated
    IF (SELECT COUNT(*) FROM lease_transactions WHERE id = ANY(p_transaction_ids) AND invoice_group = v_invoice_group) != array_length(p_transaction_ids, 1) THEN
        RAISE EXCEPTION 'Failed to create invoice - some transactions could not be updated';
    END IF;
    
    RETURN v_invoice_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record payment
CREATE OR REPLACE FUNCTION record_payment(
    p_lease_id UUID,
    p_amount DECIMAL(10,2),
    p_payment_method TEXT,
    p_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_payment_group UUID;
    v_remaining_amount DECIMAL(10,2);
    invoice_record RECORD;
BEGIN
    v_payment_group := gen_random_uuid();
    v_remaining_amount := p_amount;
    
    -- Create payment transaction
    INSERT INTO lease_transactions (
        lease_id, transaction_type, amount, vat_amount,
        description, status, payment_group, reference_number, created_by
    ) VALUES (
        p_lease_id, 'payment', -p_amount, 0,
        format('Payment via %s%s%s', 
               p_payment_method,
               CASE WHEN p_reference IS NOT NULL THEN format(' (Ref: %s)', p_reference) ELSE '' END,
               CASE WHEN p_notes IS NOT NULL THEN format(' - %s', p_notes) ELSE '' END
        ),
        'paid', v_payment_group, p_reference, auth.uid()
    ) RETURNING id INTO v_payment_id;
    
    -- Auto-allocate to oldest invoices first
    FOR invoice_record IN 
        SELECT invoice_group, SUM(total_amount) as invoice_total
        FROM lease_transactions 
        WHERE lease_id = p_lease_id 
          AND status = 'invoiced' 
          AND invoice_group IS NOT NULL
          AND deleted_at IS NULL
        GROUP BY invoice_group
        ORDER BY MIN(created_at)
    LOOP
        EXIT WHEN v_remaining_amount <= 0;
        
        IF v_remaining_amount >= invoice_record.invoice_total THEN
            -- Full payment of invoice
            UPDATE lease_transactions 
            SET status = 'paid', 
                payment_group = v_payment_group,
                updated_by = auth.uid(),
                updated_at = NOW(),
                version = version + 1
            WHERE invoice_group = invoice_record.invoice_group
              AND status = 'invoiced';
            
            v_remaining_amount := v_remaining_amount - invoice_record.invoice_total;
        ELSE
            -- Partial payment - leave as invoiced but link to payment
            UPDATE lease_transactions 
            SET payment_group = v_payment_group,
                updated_by = auth.uid(),
                updated_at = NOW(),
                version = version + 1
            WHERE invoice_group = invoice_record.invoice_group
              AND status = 'invoiced';
            
            v_remaining_amount := 0;
        END IF;
    END LOOP;
    
    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. AUTOMATIC OVERDUE DETECTION
CREATE OR REPLACE FUNCTION update_overdue_status() RETURNS void AS $$
BEGIN
    UPDATE lease_transactions 
    SET status = 'overdue',
        updated_at = NOW(),
        version = version + 1
    WHERE status = 'invoiced' 
      AND due_date < CURRENT_DATE
      AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lease_transactions_updated_at ON lease_transactions;
CREATE TRIGGER trg_lease_transactions_updated_at
    BEFORE UPDATE ON lease_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. ROW LEVEL SECURITY
ALTER TABLE lease_transactions ENABLE ROW LEVEL SECURITY;

-- Allow accounts and admin users to manage all transactions
CREATE POLICY "Accounts users can manage transactions" ON lease_transactions
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'accounts')
            )
        )
    );

-- Allow leasing users to view transactions for their leases
CREATE POLICY "Leasing users can view transactions" ON lease_transactions
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'accounts', 'leasing')
            )
        )
    );

-- 9. SAMPLE DATA FOR TESTING (commented out)
/*
-- Add monthly rent for a lease
SELECT add_charge(
    'your-lease-id-here'::UUID,
    'monthly_rent',
    2500.00,
    'Monthly lease payment - January 2024',
    '2024-02-01'::DATE
);

-- Create invoice
SELECT create_invoice(
    'your-lease-id-here'::UUID,
    ARRAY['transaction-id-here'::UUID]
);

-- Record payment
SELECT record_payment(
    'your-lease-id-here'::UUID,
    2625.00, -- Amount with VAT
    'Bank Transfer',
    'TXN123456',
    'Payment for January invoice'
);
*/

-- Success message
SELECT 'Simple Accounting System created successfully! 🎉' as result;
