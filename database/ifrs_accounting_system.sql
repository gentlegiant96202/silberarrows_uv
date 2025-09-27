-- 🏛️ -COMPLIANT LEASE ACCOUNTING SYSTEM
-- Complete recreation with all existing features +  compliance + transaction safety

-- 1. ENUMS (matching existing system exactly)
DO $$ BEGIN
    CREATE TYPE ifrs_charge_type_enum AS ENUM (
        'rental',     -- Monthly rental payments
        'salik',      -- Salik/toll charges  
        'mileage',    -- Excess mileage charges
        'late_fee',   -- Late payment fees
        'fine',       -- Traffic fines
        'refund'      -- Refunds/credits
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ifrs_accounting_status_enum AS ENUM (
        'pending',    -- Ready to be invoiced
        'invoiced',   -- Sent to customer
        'paid',       -- Fully paid
        'overdue'     -- Past due date
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. MAIN ACCOUNTING TABLE (Compliant with all existing features)
CREATE TABLE IF NOT EXISTS ifrs_lease_accounting (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID NOT NULL REFERENCES leasing_customers(id) ON DELETE CASCADE,
    
    -- Billing period (matching existing system)
    billing_period DATE NOT NULL,
    
    -- Charge details (exactly like existing)
    charge_type ifrs_charge_type_enum NOT NULL,
    quantity NUMERIC NULL, -- For salik count, mileage km, etc.
    unit_price NUMERIC NULL, -- Price per unit
    total_amount NUMERIC NOT NULL, -- Final amount (quantity × unit_price or flat amount)
    comment TEXT NULL,
    
    -- Invoice and payment linking (exactly like existing)
    invoice_id UUID NULL, -- Groups charges into invoices
    invoice_number TEXT NULL, -- Sequential invoice number (INV-LE-1000, etc.)
    payment_id UUID NULL, -- Links to payment when paid
    
    -- Status and settings (exactly like existing)
    status ifrs_accounting_status_enum NOT NULL DEFAULT 'pending',
    vat_applicable BOOLEAN NOT NULL DEFAULT true,
    account_closed BOOLEAN NOT NULL DEFAULT false,
    
    --  COMPLIANCE ADDITIONS
    -- Audit trail (required by )
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Version control for optimistic locking (prevents concurrent editing issues)
    version INTEGER DEFAULT 1,
    
    -- Soft delete for audit trail ( requirement)
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    deleted_by UUID REFERENCES auth.users(id),
    deleted_reason TEXT NULL,
    
    -- Document attachments ( supporting documentation)
    documents JSONB DEFAULT '[]'::jsonb,
    
    --  adjustments and reversals tracking
    adjustment_reference UUID NULL, -- Links to original transaction if this is an adjustment
    reversal_reference UUID NULL,   -- Links to original transaction if this is a reversal
    
    -- Data integrity constraints
    CONSTRAINT valid_amount CHECK (
        (charge_type = 'refund' AND total_amount <= 0) OR 
        (charge_type != 'refund' AND total_amount >= 0)
    ),
    CONSTRAINT valid_quantity CHECK (quantity IS NULL OR quantity >= 0),
    CONSTRAINT valid_unit_price CHECK (unit_price IS NULL OR unit_price >= 0),
    CONSTRAINT valid_calculation CHECK (
        (quantity IS NULL OR unit_price IS NULL) OR 
        (ABS(total_amount - (quantity * unit_price)) < 0.01)
    )
);

-- 3. CUSTOMER BALANCE VIEW (Real-time balance calculation)
CREATE OR REPLACE VIEW ifrs_lease_balances AS
SELECT 
    lease_id,
    SUM(total_amount) as current_balance,
    SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount,
    SUM(CASE WHEN status = 'invoiced' AND billing_period < CURRENT_DATE THEN total_amount ELSE 0 END) as past_due_amount,
    COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
    MAX(CASE WHEN status = 'overdue' THEN billing_period END) as oldest_overdue_date,
    COUNT(*) as total_transactions,
    MIN(created_at) as first_transaction_date,
    MAX(updated_at) as last_activity_date
FROM ifrs_lease_accounting 
WHERE deleted_at IS NULL
GROUP BY lease_id;

-- 4. BILLING PERIODS VIEW (matching existing BillingPeriodsView functionality)
CREATE OR REPLACE VIEW ifrs_billing_periods AS
WITH period_data AS (
    SELECT 
        lease_id,
        billing_period,
        DATE_TRUNC('month', billing_period) as period_start,
        (DATE_TRUNC('month', billing_period) + INTERVAL '1 month - 1 day')::DATE as period_end,
        ARRAY_AGG(
            JSON_BUILD_OBJECT(
                'id', id,
                'charge_type', charge_type,
                'total_amount', total_amount,
                'status', status,
                'invoice_id', invoice_id,
                'created_at', created_at
            ) ORDER BY created_at
        ) as charges,
        SUM(total_amount) as total_amount,
        BOOL_OR(invoice_id IS NOT NULL) as has_invoice,
        STRING_AGG(DISTINCT invoice_id::TEXT, ',') as invoice_ids,
        CASE 
            WHEN BOOL_OR(status = 'overdue') THEN 'overdue'
            WHEN BOOL_OR(status = 'paid') AND NOT BOOL_OR(status IN ('pending', 'invoiced', 'overdue')) THEN 'paid'
            WHEN BOOL_OR(status = 'invoiced') THEN 'invoiced'
            WHEN BOOL_OR(status = 'pending') THEN 'pending_invoice'
            WHEN DATE_TRUNC('month', billing_period) > DATE_TRUNC('month', CURRENT_DATE) THEN 'upcoming'
            ELSE 'active'
        END as period_status
    FROM ifrs_lease_accounting 
    WHERE deleted_at IS NULL
    GROUP BY lease_id, billing_period, DATE_TRUNC('month', billing_period)
)
SELECT 
    lease_id,
    billing_period as period,
    period_start::TEXT as period_start,
    period_end::TEXT as period_end,
    charges,
    total_amount,
    has_invoice,
    invoice_ids,
    period_status as status
FROM period_data;

-- 5. SEQUENTIAL INVOICE NUMBERING
-- Create sequence for invoice numbers starting at 1000
CREATE SEQUENCE IF NOT EXISTS lease_invoice_sequence 
START WITH 1000 
INCREMENT BY 1 
NO MAXVALUE 
NO CYCLE;

-- 6. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_ifrs_lease_accounting_lease_id 
ON ifrs_lease_accounting(lease_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lease_accounting_billing_period 
ON ifrs_lease_accounting(billing_period) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lease_accounting_status 
ON ifrs_lease_accounting(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lease_accounting_invoice_id 
ON ifrs_lease_accounting(invoice_id) WHERE deleted_at IS NULL AND invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lease_accounting_payment_id 
ON ifrs_lease_accounting(payment_id) WHERE deleted_at IS NULL AND payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lease_accounting_invoice_number 
ON ifrs_lease_accounting(invoice_number) WHERE deleted_at IS NULL AND invoice_number IS NOT NULL;

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_lease_accounting_lease_status 
ON ifrs_lease_accounting(lease_id, status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lease_accounting_lease_period 
ON ifrs_lease_accounting(lease_id, billing_period) WHERE deleted_at IS NULL;

-- 7. INVOICE NUMBER HELPER FUNCTIONS

-- Function to preview next invoice number (without consuming sequence)
CREATE OR REPLACE FUNCTION preview_next_invoice_number()
RETURNS TEXT AS $$
DECLARE
    v_next_sequence INTEGER;
BEGIN
    SELECT last_value + 1 INTO v_next_sequence 
    FROM lease_invoice_sequence;
    
    RETURN 'INV-LE-' || v_next_sequence::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current sequence value
CREATE OR REPLACE FUNCTION get_current_invoice_sequence()
RETURNS INTEGER AS $$
BEGIN
    RETURN currval('lease_invoice_sequence');
EXCEPTION
    WHEN SQLSTATE '55000' THEN -- sequence not yet used
        RETURN 999; -- Will be 1000 on first use
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TRANSACTION-SAFE FUNCTIONS

-- Function to add a charge (matching existing functionality)
CREATE OR REPLACE FUNCTION ifrs_add_charge(
    p_lease_id UUID,
    p_billing_period DATE,
    p_charge_type ifrs_charge_type_enum,
    p_total_amount NUMERIC,
    p_quantity NUMERIC DEFAULT NULL,
    p_unit_price NUMERIC DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_vat_applicable BOOLEAN DEFAULT true
) RETURNS UUID AS $$
DECLARE
    v_charge_id UUID;
BEGIN
    -- Insert charge with  audit trail
    INSERT INTO ifrs_lease_accounting (
        lease_id, billing_period, charge_type, quantity, unit_price, 
        total_amount, comment, status, vat_applicable, created_by
    ) VALUES (
        p_lease_id, p_billing_period, p_charge_type, p_quantity, p_unit_price,
        p_total_amount, p_comment, 'pending', p_vat_applicable, auth.uid()
    ) RETURNING id INTO v_charge_id;
    
    RETURN v_charge_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a charge (-compliant with version control)
CREATE OR REPLACE FUNCTION ifrs_update_charge(
    p_charge_id UUID,
    p_charge_type ifrs_charge_type_enum,
    p_total_amount NUMERIC,
    p_expected_version INTEGER DEFAULT 1,
    p_quantity NUMERIC DEFAULT NULL,
    p_unit_price NUMERIC DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_vat_applicable BOOLEAN DEFAULT true
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_version INTEGER;
BEGIN
    -- Check current version for optimistic locking
    SELECT version INTO v_current_version 
    FROM ifrs_lease_accounting 
    WHERE id = p_charge_id AND deleted_at IS NULL;
    
    IF v_current_version IS NULL THEN
        RAISE EXCEPTION 'Charge not found or has been deleted';
    END IF;
    
    IF v_current_version != p_expected_version THEN
        RAISE EXCEPTION 'Charge has been modified by another user. Please refresh and try again.';
    END IF;
    
    -- Update charge
    UPDATE ifrs_lease_accounting 
    SET 
        charge_type = p_charge_type,
        quantity = p_quantity,
        unit_price = p_unit_price,
        total_amount = p_total_amount,
        comment = p_comment,
        vat_applicable = p_vat_applicable,
        updated_by = auth.uid(),
        updated_at = NOW(),
        version = version + 1
    WHERE id = p_charge_id AND deleted_at IS NULL;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete a charge ( soft delete)
CREATE OR REPLACE FUNCTION ifrs_delete_charge(
    p_charge_id UUID,
    p_reason TEXT DEFAULT 'User requested deletion'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Soft delete for audit trail
    UPDATE ifrs_lease_accounting 
    SET 
        deleted_at = NOW(),
        deleted_by = auth.uid(),
        deleted_reason = p_reason,
        updated_at = NOW(),
        version = version + 1
    WHERE id = p_charge_id 
      AND deleted_at IS NULL
      AND status = 'pending'; -- Only allow deletion of pending charges
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Charge not found or cannot be deleted (may be already invoiced)';
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate invoice (transaction-safe with sequential numbering)
CREATE OR REPLACE FUNCTION ifrs_generate_invoice(
    p_lease_id UUID,
    p_billing_period DATE,
    p_charge_ids UUID[]
) RETURNS JSON AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_invoice_sequence INTEGER;
    v_affected_rows INTEGER;
    v_retry_count INTEGER := 0;
BEGIN
    -- Generate invoice ID
    v_invoice_id := gen_random_uuid();
    
    -- Loop to handle potential sequence conflicts
    LOOP
        -- Get next sequence number
        v_invoice_sequence := nextval('lease_invoice_sequence');
        v_invoice_number := 'INV-LE-' || v_invoice_sequence::TEXT;
        
        -- Check if this invoice number already exists
        IF NOT EXISTS (
            SELECT 1 FROM ifrs_lease_accounting 
            WHERE invoice_number = v_invoice_number 
            AND deleted_at IS NULL
        ) THEN
            EXIT; -- Invoice number is unique, proceed
        END IF;
        
        -- Increment retry count and check limit
        v_retry_count := v_retry_count + 1;
        IF v_retry_count > 10 THEN
            RAISE EXCEPTION 'Unable to generate unique invoice number after 10 attempts';
        END IF;
    END LOOP;
    
    -- Update charges to invoiced status atomically
    UPDATE ifrs_lease_accounting 
    SET 
        status = 'invoiced',
        invoice_id = v_invoice_id,
        invoice_number = v_invoice_number,
        updated_by = auth.uid(),
        updated_at = NOW(),
        version = version + 1
    WHERE id = ANY(p_charge_ids)
      AND lease_id = p_lease_id
      AND billing_period = p_billing_period
      AND status = 'pending'
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    -- Verify all charges were updated
    IF v_affected_rows != array_length(p_charge_ids, 1) THEN
        RAISE EXCEPTION 'Failed to generate invoice - some charges could not be updated. Expected: %, Updated: %', 
                       array_length(p_charge_ids, 1), v_affected_rows;
    END IF;
    
    -- Return both invoice ID and number
    RETURN json_build_object(
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'sequence', v_invoice_sequence,
        'charges_updated', v_affected_rows
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record payment (transaction-safe with auto-allocation)
CREATE OR REPLACE FUNCTION ifrs_record_payment(
    p_lease_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
    v_remaining_amount NUMERIC;
    invoice_record RECORD;
BEGIN
    v_payment_id := gen_random_uuid();
    v_remaining_amount := p_amount;
    
    -- Create payment record
    INSERT INTO ifrs_lease_accounting (
        lease_id, billing_period, charge_type, total_amount,
        comment, payment_id, status, vat_applicable, created_by
    ) VALUES (
        p_lease_id, CURRENT_DATE, 'refund', -p_amount,
        format('PAYMENT %s - %s%s%s', 
               substring(v_payment_id::text from 1 for 8),
               upper(p_payment_method),
               CASE WHEN p_reference IS NOT NULL THEN format(' (Ref: %s)', p_reference) ELSE '' END,
               CASE WHEN p_notes IS NOT NULL THEN format(' - %s', p_notes) ELSE '' END
        ),
        v_payment_id, 'paid', false, auth.uid()
    );
    
    -- Auto-allocate to oldest invoices first
    FOR invoice_record IN 
        SELECT invoice_id, SUM(total_amount) as invoice_total
        FROM ifrs_lease_accounting 
        WHERE lease_id = p_lease_id 
          AND status = 'invoiced' 
          AND invoice_id IS NOT NULL
          AND deleted_at IS NULL
        GROUP BY invoice_id
        ORDER BY MIN(created_at)
    LOOP
        EXIT WHEN v_remaining_amount <= 0;
        
        IF v_remaining_amount >= invoice_record.invoice_total THEN
            -- Full payment of invoice
            UPDATE ifrs_lease_accounting 
            SET status = 'paid', 
                payment_id = v_payment_id,
                updated_by = auth.uid(),
                updated_at = NOW(),
                version = version + 1
            WHERE invoice_id = invoice_record.invoice_id
              AND status = 'invoiced'
              AND deleted_at IS NULL;
            
            v_remaining_amount := v_remaining_amount - invoice_record.invoice_total;
        ELSE
            -- Partial payment - keep as invoiced but link to payment
            UPDATE ifrs_lease_accounting 
            SET payment_id = v_payment_id,
                updated_by = auth.uid(),
                updated_at = NOW(),
                version = version + 1
            WHERE invoice_id = invoice_record.invoice_id
              AND status = 'invoiced'
              AND deleted_at IS NULL;
            
            v_remaining_amount := 0;
        END IF;
    END LOOP;
    
    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. AUTOMATIC OVERDUE DETECTION
CREATE OR REPLACE FUNCTION ifrs_update_overdue_status() RETURNS INTEGER AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE ifrs_lease_accounting 
    SET status = 'overdue',
        updated_at = NOW(),
        version = version + 1
    WHERE status = 'invoiced' 
      AND billing_period < CURRENT_DATE - INTERVAL '30 days' -- 30 days past due
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TRIGGERS FOR AUDIT TRAIL
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = COALESCE(NEW.updated_by, auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lease_accounting_updated_at ON ifrs_lease_accounting;
CREATE TRIGGER trg_lease_accounting_updated_at
    BEFORE UPDATE ON ifrs_lease_accounting
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. ROW LEVEL SECURITY ( access controls)
ALTER TABLE ifrs_lease_accounting ENABLE ROW LEVEL SECURITY;

-- Accounts and admin users can manage all transactions
CREATE POLICY "Accounts users can manage transactions" ON ifrs_lease_accounting
    FOR ALL USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'accounts')
            )
        )
    );

-- Leasing users can view transactions for their leases
CREATE POLICY "Leasing users can view transactions" ON ifrs_lease_accounting
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND (
            EXISTS (
                SELECT 1 FROM user_roles 
                WHERE user_id = auth.uid() 
                AND role IN ('admin', 'accounts', 'leasing')
            )
        )
    );

-- 10. SCHEDULED OVERDUE UPDATES (optional cron job)
/*
-- Run this as a scheduled function to automatically update overdue status
SELECT cron.schedule('update-overdue-invoices', '0 6 * * *', 'SELECT ifrs_update_overdue_status();');
*/

-- Success message
SELECT '-Compliant Lease Accounting System created successfully! 🏛️' as result;
