-- =====================================================
-- DEBIT NOTES IMPLEMENTATION - STEP 1: ADD ENUM VALUE
-- 
-- ⚠️  RUN THIS FIRST, THEN RUN STEP 2 SEPARATELY
-- PostgreSQL requires enum values to be committed before use
-- =====================================================

-- 1. Add 'debit_note' to adjustment_type enum
-- Run this FIRST and let it commit
ALTER TYPE uv_adjustment_type ADD VALUE IF NOT EXISTS 'debit_note';

-- =====================================================
-- STOP HERE! 
-- After running the above, run the rest in a new query
-- =====================================================

-- 2. Add debit_note_total column to invoices
ALTER TABLE uv_invoices 
ADD COLUMN IF NOT EXISTS debit_note_total NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 3. Drop and recreate balance_due with new formula
ALTER TABLE uv_invoices DROP COLUMN IF EXISTS balance_due;

ALTER TABLE uv_invoices 
ADD COLUMN balance_due NUMERIC(12,2) GENERATED ALWAYS AS (
    total_amount + debit_note_total - credit_note_total - paid_amount
) STORED;

-- 4. Create trigger function to apply debit note to invoice
CREATE OR REPLACE FUNCTION apply_debit_note_to_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.adjustment_type = 'debit_note' AND NEW.invoice_id IS NOT NULL THEN
        UPDATE uv_invoices
        SET debit_note_total = debit_note_total + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for debit notes (fires after insert on adjustments)
DROP TRIGGER IF EXISTS trg_apply_debit_note ON uv_adjustments;
CREATE TRIGGER trg_apply_debit_note
    AFTER INSERT ON uv_adjustments
    FOR EACH ROW
    WHEN (NEW.adjustment_type = 'debit_note')
    EXECUTE FUNCTION apply_debit_note_to_invoice();

-- 6. Update invoice status trigger to account for debit notes
CREATE OR REPLACE FUNCTION update_uv_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    v_effective_total NUMERIC(12,2);
    v_total_applied NUMERIC(12,2);
BEGIN
    -- Don't change status if invoice is reversed
    IF NEW.status = 'reversed' THEN
        RETURN NEW;
    END IF;
    
    -- Effective total = original amount + debit notes (what customer owes)
    v_effective_total := NEW.total_amount + COALESCE(NEW.debit_note_total, 0);
    
    -- Total applied = payments + credit notes (what's been applied)
    v_total_applied := COALESCE(NEW.paid_amount, 0) + COALESCE(NEW.credit_note_total, 0);
    
    -- Update status based on comparison
    IF v_total_applied >= v_effective_total AND v_effective_total > 0 THEN
        NEW.status := 'paid';
    ELSIF v_total_applied > 0 AND v_total_applied < v_effective_total THEN
        NEW.status := 'partial';
    ELSIF NEW.status NOT IN ('reversed', 'refunded') THEN
        NEW.status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Ensure the trigger exists
DROP TRIGGER IF EXISTS trg_update_uv_invoice_status ON uv_invoices;
CREATE TRIGGER trg_update_uv_invoice_status
    BEFORE UPDATE ON uv_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_invoice_status();

-- 8. Add document counter for debit notes
INSERT INTO uv_document_counters (document_type, prefix, last_number)
VALUES ('debit_note', 'UV-DN-', 1000)
ON CONFLICT (document_type) DO NOTHING;

-- 9. Add comments
COMMENT ON COLUMN uv_invoices.debit_note_total IS 'Sum of all debit notes applied to this invoice (increases balance)';
COMMENT ON COLUMN uv_invoices.balance_due IS 'Auto-calculated: total_amount + debit_note_total - credit_note_total - paid_amount';

-- 10. Populate debit_note_total from any existing debit notes
UPDATE uv_invoices inv
SET debit_note_total = COALESCE((
    SELECT SUM(amount) 
    FROM uv_adjustments adj 
    WHERE adj.invoice_id = inv.id 
    AND adj.adjustment_type = 'debit_note'
), 0);

-- =====================================================
-- 11. UPDATE SOA VIEW TO INCLUDE DEBIT NOTES
-- =====================================================

CREATE OR REPLACE VIEW uv_statement_of_account AS
WITH all_transactions AS (
    -- ALL Invoices (including reversed - credit notes handle the reversal credit)
    SELECT 
        inv.created_at AS transaction_date,
        'invoice'::text AS transaction_type,
        inv.invoice_number AS reference,
        'Invoice'::text AS description,
        inv.total_amount AS debit,
        0::numeric AS credit,
        so.lead_id,
        inv.id AS source_id
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id

    UNION ALL

    -- ALL Payments (allocated or not)
    SELECT 
        p.created_at AS transaction_date,
        'payment'::text AS transaction_type,
        p.payment_number AS reference,
        'Payment (' || p.payment_method || ')' AS description,
        0::numeric AS debit,
        p.amount AS credit,
        p.lead_id,
        p.id AS source_id
    FROM uv_payments p
    WHERE p.status = 'received'

    UNION ALL

    -- Credit Notes (reduces customer balance)
    SELECT 
        adj.created_at AS transaction_date,
        'credit_note'::text AS transaction_type,
        adj.adjustment_number AS reference,
        'Credit Note: ' || adj.reason AS description,
        0::numeric AS debit,
        adj.amount AS credit,
        adj.lead_id,
        adj.id AS source_id
    FROM uv_adjustments adj
    WHERE adj.adjustment_type = 'credit_note'

    UNION ALL

    -- Debit Notes (INCREASES customer balance - NEW)
    SELECT 
        adj.created_at AS transaction_date,
        'debit_note'::text AS transaction_type,
        adj.adjustment_number AS reference,
        'Debit Note: ' || adj.reason AS description,
        adj.amount AS debit,  -- DEBIT (increases balance)
        0::numeric AS credit,
        adj.lead_id,
        adj.id AS source_id
    FROM uv_adjustments adj
    WHERE adj.adjustment_type = 'debit_note'

    UNION ALL

    -- Refunds WITH linked payment (via uv_refund_allocations)
    SELECT 
        adj.created_at AS transaction_date,
        'refund'::text AS transaction_type,
        adj.adjustment_number AS reference,
        'Refund of ' || p.payment_number || ' (' || COALESCE(adj.refund_method, 'N/A') || '): ' || adj.reason AS description,
        ra.amount AS debit,
        0::numeric AS credit,
        adj.lead_id,
        ra.id AS source_id
    FROM uv_adjustments adj
    JOIN uv_refund_allocations ra ON ra.refund_id = adj.id
    JOIN uv_payments p ON ra.payment_id = p.id
    WHERE adj.adjustment_type = 'refund'

    UNION ALL

    -- Refunds WITHOUT linked payment (legacy refunds)
    SELECT 
        adj.created_at AS transaction_date,
        'refund'::text AS transaction_type,
        adj.adjustment_number AS reference,
        'Refund (' || COALESCE(adj.refund_method, 'N/A') || '): ' || adj.reason AS description,
        adj.amount AS debit,
        0::numeric AS credit,
        adj.lead_id,
        adj.id AS source_id
    FROM uv_adjustments adj
    WHERE adj.adjustment_type = 'refund'
    AND NOT EXISTS (SELECT 1 FROM uv_refund_allocations ra WHERE ra.refund_id = adj.id)
)
SELECT 
    transaction_date,
    transaction_type,
    reference,
    description,
    debit,
    credit,
    lead_id,
    source_id,
    SUM(debit - credit) OVER (
        PARTITION BY lead_id 
        ORDER BY transaction_date, 
            CASE transaction_type 
                WHEN 'invoice' THEN 1 
                WHEN 'debit_note' THEN 2  -- Debit notes right after invoices
                WHEN 'payment' THEN 3 
                WHEN 'credit_note' THEN 4 
                WHEN 'refund' THEN 5
                ELSE 6 
            END,
            reference
        ROWS UNBOUNDED PRECEDING
    ) AS running_balance
FROM all_transactions
ORDER BY lead_id, transaction_date, reference;

-- =====================================================
-- 12. UPDATE GET_CUSTOMER_BALANCE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_balance(p_lead_id UUID)
RETURNS TABLE (
    total_invoiced NUMERIC,
    total_debit_notes NUMERIC,
    total_paid NUMERIC,
    total_credit_notes NUMERIC,
    total_refunds NUMERIC,
    current_balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'invoice' THEN debit ELSE 0 END), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN transaction_type = 'debit_note' THEN debit ELSE 0 END), 0) as total_debit_notes,
        COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN credit ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit_note' THEN credit ELSE 0 END), 0) as total_credit_notes,
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN debit ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(debit - credit), 0) as current_balance
    FROM uv_statement_of_account
    WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. ADD DEBIT NOTE ENTRY TYPE TO LEDGER
-- =====================================================

-- Update ledger entry_type check constraint to allow debit_note
ALTER TABLE uv_ledger_entries DROP CONSTRAINT IF EXISTS uv_ledger_entries_entry_type_check;
ALTER TABLE uv_ledger_entries ADD CONSTRAINT uv_ledger_entries_entry_type_check 
    CHECK (entry_type IN ('invoice', 'payment', 'credit_note', 'debit_note', 'refund', 'adjustment'));

-- =====================================================
-- 14. CREATE LEDGER TRIGGER FOR DEBIT NOTES
-- =====================================================

CREATE OR REPLACE FUNCTION create_ledger_entry_for_debit_note()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_name TEXT;
    v_customer_number TEXT;
    v_customer_phone TEXT;
BEGIN
    -- Only process debit notes
    IF NEW.adjustment_type != 'debit_note' THEN
        RETURN NEW;
    END IF;

    -- Get customer info from lead
    SELECT l.full_name, l.customer_number, l.phone_number
    INTO v_customer_name, v_customer_number, v_customer_phone
    FROM leads l
    WHERE l.id = NEW.lead_id;

    -- Insert ledger entry (DEBIT - increases customer balance)
    INSERT INTO uv_ledger_entries (
        transaction_date,
        entry_type,
        document_number,
        description,
        debit,
        credit,
        lead_id,
        customer_name,
        customer_number,
        customer_phone,
        source_table,
        source_id,
        pdf_url,
        created_by
    ) VALUES (
        NEW.created_at::date,
        'debit_note',
        NEW.adjustment_number,
        'Debit Note: ' || NEW.reason,
        NEW.amount,  -- DEBIT (increases balance)
        0,
        NEW.lead_id,
        v_customer_name,
        v_customer_number,
        v_customer_phone,
        'uv_adjustments',
        NEW.id,
        NULL,  -- PDF URL will be updated when generated
        NEW.created_by
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_ledger_debit_note ON uv_adjustments;
CREATE TRIGGER trg_ledger_debit_note
    AFTER INSERT ON uv_adjustments
    FOR EACH ROW
    WHEN (NEW.adjustment_type = 'debit_note')
    EXECUTE FUNCTION create_ledger_entry_for_debit_note();

-- =====================================================
-- 15. VERIFY
-- =====================================================

SELECT 'Debit notes implementation complete' AS status;

-- Show updated invoice structure
SELECT 
    invoice_number,
    total_amount,
    debit_note_total,
    credit_note_total,
    paid_amount,
    balance_due,
    status
FROM uv_invoices
ORDER BY created_at DESC
LIMIT 5;

