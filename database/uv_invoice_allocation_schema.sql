-- =====================================================
-- UV ACCOUNTING - INVOICE ALLOCATION SYSTEM
-- =====================================================
-- Run this AFTER uv_accounting_schema.sql
-- =====================================================

-- =====================================================
-- 1. CREATE UV_INVOICES TABLE
-- Track invoices separately for allocation
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to deal
    deal_id UUID NOT NULL REFERENCES uv_deals(id) ON DELETE CASCADE,
    
    -- Invoice details
    invoice_number TEXT UNIQUE NOT NULL,
    invoice_url TEXT,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- Status: active or voided
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'voided')),
    
    -- Voiding info
    voided_at TIMESTAMP WITH TIME ZONE,
    voided_by_credit_note_id UUID, -- Reference to the credit note that voided this
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uv_invoices_deal_id ON uv_invoices(deal_id);
CREATE INDEX IF NOT EXISTS idx_uv_invoices_status ON uv_invoices(status);

-- =====================================================
-- 2. ADD ALLOCATION COLUMN TO TRANSACTIONS
-- =====================================================
ALTER TABLE uv_transactions 
ADD COLUMN IF NOT EXISTS allocated_invoice_id UUID REFERENCES uv_invoices(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_uv_transactions_allocated_invoice ON uv_transactions(allocated_invoice_id);

-- =====================================================
-- 3. FUNCTION: Create Invoice
-- Creates invoice record and returns it
-- =====================================================
CREATE OR REPLACE FUNCTION create_uv_invoice(
    p_deal_id UUID,
    p_invoice_url TEXT DEFAULT NULL
)
RETURNS uv_invoices AS $$
DECLARE
    v_invoice uv_invoices;
    v_invoice_number TEXT;
    v_total_amount DECIMAL;
BEGIN
    -- Get next invoice number
    v_invoice_number := get_next_uv_document_number('invoice');
    
    -- Calculate total from charges
    SELECT COALESCE(SUM(amount), 0) INTO v_total_amount
    FROM uv_charges WHERE deal_id = p_deal_id;
    
    -- Insert invoice
    INSERT INTO uv_invoices (
        deal_id,
        invoice_number,
        invoice_url,
        total_amount,
        status
    ) VALUES (
        p_deal_id,
        v_invoice_number,
        p_invoice_url,
        v_total_amount,
        'active'
    )
    RETURNING * INTO v_invoice;
    
    -- Update deal with current invoice info (for backward compatibility)
    UPDATE uv_deals 
    SET invoice_number = v_invoice_number,
        invoice_url = p_invoice_url,
        updated_at = NOW()
    WHERE id = p_deal_id;
    
    RETURN v_invoice;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. FUNCTION: Void Invoice (when credit note >= invoice total)
-- =====================================================
CREATE OR REPLACE FUNCTION void_uv_invoice(
    p_invoice_id UUID,
    p_credit_note_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_deal_id UUID;
BEGIN
    -- Get deal_id
    SELECT deal_id INTO v_deal_id FROM uv_invoices WHERE id = p_invoice_id;
    
    -- Mark invoice as voided
    UPDATE uv_invoices
    SET status = 'voided',
        voided_at = NOW(),
        voided_by_credit_note_id = p_credit_note_id
    WHERE id = p_invoice_id;
    
    -- Unallocate all payments from this invoice
    UPDATE uv_transactions
    SET allocated_invoice_id = NULL
    WHERE allocated_invoice_id = p_invoice_id;
    
    -- Clear current invoice from deal (allows new invoice creation)
    UPDATE uv_deals
    SET invoice_number = NULL,
        invoice_url = NULL,
        updated_at = NOW()
    WHERE id = v_deal_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. FUNCTION: Allocate Payment to Invoice
-- =====================================================
CREATE OR REPLACE FUNCTION allocate_uv_payment(
    p_transaction_id UUID,
    p_invoice_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE uv_transactions
    SET allocated_invoice_id = p_invoice_id
    WHERE id = p_transaction_id
      AND transaction_type IN ('deposit', 'payment');
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNCTION: Unallocate Payment
-- =====================================================
CREATE OR REPLACE FUNCTION unallocate_uv_payment(p_transaction_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE uv_transactions
    SET allocated_invoice_id = NULL
    WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNCTION: Check if invoice should be voided
-- Called after credit note is added
-- =====================================================
CREATE OR REPLACE FUNCTION check_and_void_invoice_if_needed(p_deal_id UUID)
RETURNS VOID AS $$
DECLARE
    v_active_invoice RECORD;
    v_total_credits DECIMAL;
BEGIN
    -- Get active invoice for this deal
    SELECT id, total_amount INTO v_active_invoice
    FROM uv_invoices
    WHERE deal_id = p_deal_id AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_active_invoice.id IS NULL THEN
        RETURN; -- No active invoice, nothing to void
    END IF;
    
    -- Calculate total credit notes for this deal
    SELECT COALESCE(SUM(amount), 0) INTO v_total_credits
    FROM uv_transactions
    WHERE deal_id = p_deal_id AND transaction_type = 'credit_note';
    
    -- If credits >= invoice total, void the invoice
    IF v_total_credits >= v_active_invoice.total_amount THEN
        PERFORM void_uv_invoice(v_active_invoice.id);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGER: Auto-check void after credit note
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_check_void_on_credit_note()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type = 'credit_note' THEN
        PERFORM check_and_void_invoice_if_needed(NEW.deal_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_void_on_credit_note ON uv_transactions;
CREATE TRIGGER check_void_on_credit_note
    AFTER INSERT ON uv_transactions
    FOR EACH ROW
    EXECUTE FUNCTION trigger_check_void_on_credit_note();

-- =====================================================
-- 9. VIEW: Invoice Summary (with allocation totals)
-- =====================================================
CREATE OR REPLACE VIEW uv_invoice_summary AS
SELECT 
    i.id,
    i.deal_id,
    i.invoice_number,
    i.invoice_url,
    i.total_amount,
    i.status,
    i.created_at,
    i.voided_at,
    i.voided_by_credit_note_id,
    -- Allocated payments total
    COALESCE(alloc.allocated_total, 0) AS allocated_amount,
    -- Balance on this invoice
    i.total_amount - COALESCE(alloc.allocated_total, 0) AS invoice_balance
FROM uv_invoices i
LEFT JOIN (
    SELECT allocated_invoice_id, SUM(amount) AS allocated_total
    FROM uv_transactions
    WHERE transaction_type IN ('deposit', 'payment')
      AND allocated_invoice_id IS NOT NULL
    GROUP BY allocated_invoice_id
) alloc ON alloc.allocated_invoice_id = i.id;

-- =====================================================
-- 10. VIEW: Unallocated Payments
-- =====================================================
CREATE OR REPLACE VIEW uv_unallocated_payments AS
SELECT 
    t.*,
    d.customer_name,
    d.deal_number
FROM uv_transactions t
JOIN uv_deals d ON d.id = t.deal_id
WHERE t.transaction_type IN ('deposit', 'payment')
  AND t.allocated_invoice_id IS NULL;

-- =====================================================
-- 11. UPDATE: Deal Summary View to include invoice info
-- =====================================================
DROP VIEW IF EXISTS uv_deal_summary CASCADE;

CREATE OR REPLACE VIEW uv_deal_summary AS
SELECT 
    d.id,
    d.lead_id,
    d.deal_number,
    d.status,
    d.customer_name,
    d.customer_phone,
    d.customer_email,
    d.customer_id_type,
    d.customer_id_number,
    d.vehicle_id,
    d.created_at,
    d.created_by,
    -- Current active invoice (from uv_invoices table)
    active_inv.id AS active_invoice_id,
    active_inv.invoice_number,
    active_inv.invoice_url,
    active_inv.total_amount AS invoice_total,
    active_inv.status AS invoice_status,
    -- Vehicle info
    c.stock_number AS vehicle_stock_number,
    c.model_year AS vehicle_year,
    c.vehicle_model,
    c.colour AS vehicle_colour,
    c.chassis_number AS vehicle_chassis,
    c.advertised_price_aed AS vehicle_price,
    -- Calculated totals from charges
    COALESCE(charges.total, 0) AS charges_total,
    -- Payment totals
    COALESCE(payments.total, 0) AS total_paid,
    COALESCE(credits.total, 0) AS total_credits,
    COALESCE(refunds.total, 0) AS total_refunds,
    -- Unallocated payments
    COALESCE(unalloc.total, 0) AS unallocated_amount,
    -- Balance due (based on charges, not invoice)
    COALESCE(charges.total, 0) 
        - COALESCE(payments.total, 0) 
        - COALESCE(credits.total, 0) 
        + COALESCE(refunds.total, 0) AS balance_due
FROM uv_deals d
LEFT JOIN cars c ON c.id = d.vehicle_id
-- Active invoice
LEFT JOIN uv_invoices active_inv ON active_inv.deal_id = d.id AND active_inv.status = 'active'
-- Charges total
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_charges GROUP BY deal_id
) charges ON charges.deal_id = d.id
-- All payments (allocated + unallocated)
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_transactions 
    WHERE transaction_type IN ('deposit', 'payment') GROUP BY deal_id
) payments ON payments.deal_id = d.id
-- Credit notes
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_transactions 
    WHERE transaction_type = 'credit_note' GROUP BY deal_id
) credits ON credits.deal_id = d.id
-- Refunds
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_transactions 
    WHERE transaction_type = 'refund' GROUP BY deal_id
) refunds ON refunds.deal_id = d.id
-- Unallocated payments
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_transactions 
    WHERE transaction_type IN ('deposit', 'payment') 
      AND allocated_invoice_id IS NULL
    GROUP BY deal_id
) unalloc ON unalloc.deal_id = d.id;

-- =====================================================
-- 12. RLS for new table
-- =====================================================
ALTER TABLE uv_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uv_invoices_all" ON uv_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 13. COMMENTS
-- =====================================================
COMMENT ON TABLE uv_invoices IS 'Invoice records with allocation tracking, supports multiple invoices per deal';
COMMENT ON COLUMN uv_transactions.allocated_invoice_id IS 'Links payment to specific invoice, NULL = unallocated';
COMMENT ON FUNCTION create_uv_invoice IS 'Creates new invoice with auto-generated number';
COMMENT ON FUNCTION void_uv_invoice IS 'Voids invoice and unallocates all payments';
COMMENT ON FUNCTION allocate_uv_payment IS 'Allocates a payment to specific invoice';
COMMENT ON FUNCTION check_and_void_invoice_if_needed IS 'Auto-voids invoice when credit notes >= invoice total';


