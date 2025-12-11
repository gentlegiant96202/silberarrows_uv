-- =====================================================
-- UV ACCOUNTING - CONSOLIDATE TRIGGERS & ENFORCE REFUND LINKS
-- 
-- Fix 4: Consolidate all adjustment triggers into ONE
-- Fix 5: Enforce refund-payment linking for new refunds
-- =====================================================

-- =====================================================
-- PART 1: DROP ALL INDIVIDUAL ADJUSTMENT TRIGGERS
-- =====================================================

-- Drop individual triggers (we'll replace with one consolidated trigger)
DROP TRIGGER IF EXISTS trg_apply_credit_note ON uv_adjustments;
DROP TRIGGER IF EXISTS trg_apply_debit_note ON uv_adjustments;
DROP TRIGGER IF EXISTS trg_apply_refund ON uv_adjustments;
DROP TRIGGER IF EXISTS trg_ledger_adjustment_created ON uv_adjustments;
DROP TRIGGER IF EXISTS trg_ledger_debit_note ON uv_adjustments;

-- Drop individual functions (no longer needed)
DROP FUNCTION IF EXISTS apply_credit_note_to_invoice();
DROP FUNCTION IF EXISTS apply_debit_note_to_invoice();
DROP FUNCTION IF EXISTS apply_refund_to_invoice();
DROP FUNCTION IF EXISTS create_ledger_entry_for_debit_note();

-- =====================================================
-- PART 2: CREATE CONSOLIDATED ADJUSTMENT HANDLER
-- =====================================================

CREATE OR REPLACE FUNCTION handle_adjustment_created()
RETURNS TRIGGER AS $$
DECLARE
    v_lead RECORD;
    v_description TEXT;
    v_debit NUMERIC(12,2);
    v_credit NUMERIC(12,2);
BEGIN
    -- ========================================
    -- STEP 1: Get customer details for ledger
    -- ========================================
    SELECT full_name, customer_number, phone_number 
    INTO v_lead
    FROM leads 
    WHERE id = NEW.lead_id;

    -- ========================================
    -- STEP 2: Apply to invoice based on type
    -- ========================================
    
    IF NEW.adjustment_type = 'credit_note' AND NEW.invoice_id IS NOT NULL THEN
        -- Credit note REDUCES what customer owes
        UPDATE uv_invoices
        SET credit_note_total = credit_note_total + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
        
        v_debit := 0;
        v_credit := NEW.amount;
        v_description := 'Credit Note: ' || COALESCE(NEW.reason, 'No reason');
        
    ELSIF NEW.adjustment_type = 'debit_note' AND NEW.invoice_id IS NOT NULL THEN
        -- Debit note INCREASES what customer owes
        UPDATE uv_invoices
        SET debit_note_total = debit_note_total + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
        
        v_debit := NEW.amount;
        v_credit := 0;
        v_description := 'Debit Note: ' || COALESCE(NEW.reason, 'No reason');
        
    ELSIF NEW.adjustment_type = 'refund' THEN
        -- Refund is customer-level (SOA), not invoice-level
        -- The refund_allocations table tracks which payment was refunded
        v_debit := NEW.amount;
        v_credit := 0;
        v_description := 'Refund (' || COALESCE(NEW.refund_method, 'N/A') || '): ' || COALESCE(NEW.reason, 'No reason');
        
    ELSE
        -- Unknown type - still create ledger entry
        v_debit := 0;
        v_credit := NEW.amount;
        v_description := 'Adjustment: ' || COALESCE(NEW.reason, 'No reason');
    END IF;

    -- ========================================
    -- STEP 3: Create ledger entry (audit trail)
    -- ========================================
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
        NEW.adjustment_type::text,
        NEW.adjustment_number,
        v_description,
        v_debit,
        v_credit,
        NEW.lead_id,
        COALESCE(v_lead.full_name, 'Unknown'),
        v_lead.customer_number,
        v_lead.phone_number,
        'uv_adjustments',
        NEW.id,
        NEW.pdf_url,
        NEW.created_by
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create single consolidated trigger
DROP TRIGGER IF EXISTS trg_handle_adjustment ON uv_adjustments;
CREATE TRIGGER trg_handle_adjustment
    AFTER INSERT ON uv_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION handle_adjustment_created();

-- =====================================================
-- PART 3: REFUND-PAYMENT LINKING (ALREADY EXISTS)
-- =====================================================
-- The refund-payment linking system is already properly implemented:
--   - uv_refund_allocations table stores refund → payment links
--   - uv_payment_summary view calculates totals dynamically
--   - allocate_refund_to_payment() function handles validation
-- No additional triggers or columns needed!

-- =====================================================
-- PART 4: VERIFY (No additional changes needed)
-- =====================================================
-- NOTE: The refund-payment linking system already exists:
--   - uv_refund_allocations table links refunds to payments
--   - uv_payment_summary view calculates allocated, refunded, available amounts
-- No redundant columns or views needed!

SELECT 'Trigger consolidation complete!' AS status;

-- Show active triggers on uv_adjustments
SELECT 
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'uv_adjustments'
ORDER BY trigger_name;

