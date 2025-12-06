-- =====================================================
-- UV SALES ACCOUNTING - STEP 4: PAYMENTS & ALLOCATIONS
-- =====================================================
-- Payments are linked to CUSTOMER (Lead), not invoice
-- Allocations link payments to invoices
-- This allows payments to be re-allocated if invoice is reversed
-- =====================================================

-- 1. Add payment counter to document counters (if not exists)
INSERT INTO uv_document_counters (document_type, last_number, prefix)
VALUES ('payment', 1000, 'UV-PMT-')
ON CONFLICT (document_type) DO NOTHING;

-- 2. Create ENUM for payment methods
DO $$ BEGIN
    CREATE TYPE uv_payment_method AS ENUM (
        'cash',
        'card',
        'bank_transfer',
        'cheque',
        'bank_finance'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create ENUM for payment status
DO $$ BEGIN
    CREATE TYPE uv_payment_status AS ENUM (
        'received',     -- Payment received and confirmed
        'pending',      -- Awaiting confirmation (e.g., cheque clearance)
        'bounced',      -- Cheque bounced
        'cancelled'     -- Payment cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Create the Payments table
CREATE TABLE IF NOT EXISTS uv_payments (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,  -- UV-PMT-1001 (auto-generated)
    
    -- Link to CUSTOMER (critical - not invoice!)
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Payment details
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method uv_payment_method NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Reference information
    reference TEXT,  -- Cheque number, transfer reference, card auth code, etc.
    bank_name TEXT,  -- For cheques and bank transfers
    
    -- Status
    status uv_payment_status NOT NULL DEFAULT 'received',
    
    -- Notes
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 5. Create trigger function to auto-generate payment number (GAPLESS)
CREATE OR REPLACE FUNCTION generate_uv_payment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_number IS NULL THEN
        NEW.payment_number := get_next_document_number('payment');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger for auto-numbering
DROP TRIGGER IF EXISTS trg_generate_uv_payment_number ON uv_payments;
CREATE TRIGGER trg_generate_uv_payment_number
    BEFORE INSERT ON uv_payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_uv_payment_number();

-- 7. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_uv_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_uv_payments_updated_at ON uv_payments;
CREATE TRIGGER trg_update_uv_payments_updated_at
    BEFORE UPDATE ON uv_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_payments_updated_at();

-- 8. Create Payment Allocations table
CREATE TABLE IF NOT EXISTS uv_payment_allocations (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    payment_id UUID NOT NULL REFERENCES uv_payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES uv_invoices(id) ON DELETE CASCADE,
    
    -- Allocation amount (portion of payment allocated to this invoice)
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Prevent duplicate allocations
    UNIQUE(payment_id, invoice_id)
);

-- 9. Create function to update invoice paid_amount when allocations change
CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_paid NUMERIC(12,2);
BEGIN
    -- Get the invoice_id from either NEW or OLD
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    -- Calculate total allocated to this invoice
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_paid
    FROM uv_payment_allocations
    WHERE invoice_id = v_invoice_id;
    
    -- Update the invoice paid_amount
    UPDATE uv_invoices
    SET paid_amount = v_total_paid,
        updated_at = NOW()
    WHERE id = v_invoice_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 10. Create triggers for allocation changes
DROP TRIGGER IF EXISTS trg_update_invoice_paid_insert ON uv_payment_allocations;
CREATE TRIGGER trg_update_invoice_paid_insert
    AFTER INSERT ON uv_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_paid_amount();

DROP TRIGGER IF EXISTS trg_update_invoice_paid_update ON uv_payment_allocations;
CREATE TRIGGER trg_update_invoice_paid_update
    AFTER UPDATE ON uv_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_paid_amount();

DROP TRIGGER IF EXISTS trg_update_invoice_paid_delete ON uv_payment_allocations;
CREATE TRIGGER trg_update_invoice_paid_delete
    AFTER DELETE ON uv_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_paid_amount();

-- 11. Create function to allocate payment to invoice
CREATE OR REPLACE FUNCTION allocate_payment_to_invoice(
    p_payment_id UUID,
    p_invoice_id UUID,
    p_amount NUMERIC(12,2),
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_payment RECORD;
    v_invoice RECORD;
    v_already_allocated NUMERIC(12,2);
    v_available NUMERIC(12,2);
    v_allocation_id UUID;
BEGIN
    -- Get payment details
    SELECT * INTO v_payment FROM uv_payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Get invoice details
    SELECT * INTO v_invoice FROM uv_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Check invoice is not reversed
    IF v_invoice.status = 'reversed' THEN
        RAISE EXCEPTION 'Cannot allocate to a reversed invoice';
    END IF;
    
    -- Check payment and invoice belong to same customer
    IF v_payment.lead_id != (SELECT lead_id FROM uv_sales_orders WHERE id = v_invoice.sales_order_id) THEN
        RAISE EXCEPTION 'Payment and invoice must belong to the same customer';
    END IF;
    
    -- Calculate how much of this payment is already allocated
    SELECT COALESCE(SUM(amount), 0) INTO v_already_allocated
    FROM uv_payment_allocations
    WHERE payment_id = p_payment_id;
    
    v_available := v_payment.amount - v_already_allocated;
    
    IF p_amount > v_available THEN
        RAISE EXCEPTION 'Insufficient unallocated amount. Available: %', v_available;
    END IF;
    
    -- Check if allocation would exceed invoice balance
    IF p_amount > v_invoice.balance_due THEN
        RAISE EXCEPTION 'Allocation amount exceeds invoice balance due. Balance: %', v_invoice.balance_due;
    END IF;
    
    -- Create the allocation
    INSERT INTO uv_payment_allocations (payment_id, invoice_id, amount, created_by)
    VALUES (p_payment_id, p_invoice_id, p_amount, p_created_by)
    RETURNING id INTO v_allocation_id;
    
    RETURN v_allocation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create function to unallocate (delete allocation)
CREATE OR REPLACE FUNCTION unallocate_payment(
    p_allocation_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM uv_payment_allocations WHERE id = p_allocation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Allocation not found';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to delete allocations when invoice is reversed
CREATE OR REPLACE FUNCTION on_invoice_reversed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'reversed' AND OLD.status != 'reversed' THEN
        -- Delete all allocations for this invoice
        -- (payments become unallocated, not deleted)
        DELETE FROM uv_payment_allocations WHERE invoice_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_on_invoice_reversed ON uv_invoices;
CREATE TRIGGER trg_on_invoice_reversed
    AFTER UPDATE ON uv_invoices
    FOR EACH ROW
    WHEN (NEW.status = 'reversed' AND OLD.status IS DISTINCT FROM 'reversed')
    EXECUTE FUNCTION on_invoice_reversed();

-- 14. Create view for payment summary (shows allocated vs unallocated)
CREATE OR REPLACE VIEW uv_payment_summary AS
SELECT 
    p.id,
    p.payment_number,
    p.lead_id,
    p.amount AS total_amount,
    p.payment_method,
    p.payment_date,
    p.reference,
    p.status,
    COALESCE(SUM(pa.amount), 0) AS allocated_amount,
    p.amount - COALESCE(SUM(pa.amount), 0) AS unallocated_amount,
    p.created_at
FROM uv_payments p
LEFT JOIN uv_payment_allocations pa ON p.id = pa.payment_id
GROUP BY p.id;

-- 15. Create indexes
CREATE INDEX IF NOT EXISTS idx_uv_payments_lead_id ON uv_payments(lead_id);
CREATE INDEX IF NOT EXISTS idx_uv_payments_payment_date ON uv_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_uv_payments_status ON uv_payments(status);
CREATE INDEX IF NOT EXISTS idx_uv_payment_allocations_payment_id ON uv_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_uv_payment_allocations_invoice_id ON uv_payment_allocations(invoice_id);

-- 16. Enable RLS
ALTER TABLE uv_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_payment_allocations ENABLE ROW LEVEL SECURITY;

-- 17. Create RLS policies
DROP POLICY IF EXISTS "Users can view payments" ON uv_payments;
CREATE POLICY "Users can view payments" ON uv_payments
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage payments" ON uv_payments;
CREATE POLICY "Users can manage payments" ON uv_payments
    FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view allocations" ON uv_payment_allocations;
CREATE POLICY "Users can view allocations" ON uv_payment_allocations
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage allocations" ON uv_payment_allocations;
CREATE POLICY "Users can manage allocations" ON uv_payment_allocations
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 18. Add comments
COMMENT ON TABLE uv_payments IS 'Customer payments - linked to lead/customer, not invoice';
COMMENT ON TABLE uv_payment_allocations IS 'Links payments to invoices - allows re-allocation if invoice reversed';
COMMENT ON COLUMN uv_payments.lead_id IS 'Critical: Links payment to customer, preserved even if invoice reversed';
COMMENT ON VIEW uv_payment_summary IS 'Shows payment totals with allocated/unallocated amounts';

-- 19. Verify creation
SELECT 'uv_payments table created successfully' AS status;
SELECT 'uv_payment_allocations table created successfully' AS status;
SELECT 'uv_payment_summary view created successfully' AS status;

-- Show counter state
SELECT 
    document_type, 
    prefix || (last_number + 1) AS next_number_will_be 
FROM uv_document_counters
WHERE document_type = 'payment';

