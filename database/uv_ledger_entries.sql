-- =====================================================
-- UV SALES ACCOUNTING - LEDGER ENTRIES TABLE
-- =====================================================
-- Permanent record of all financial transactions
-- Auto-populated via triggers when documents are created
-- =====================================================

-- 1. Create the Ledger Entries table
CREATE TABLE IF NOT EXISTS uv_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- When this entry was posted (immutable audit trail)
    posted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Transaction details
    transaction_date DATE NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('invoice', 'payment', 'credit_note', 'refund')),
    
    -- Document reference
    document_number TEXT NOT NULL,
    description TEXT,
    
    -- Amounts (one or the other, not both)
    debit NUMERIC(12,2) DEFAULT 0 CHECK (debit >= 0),
    credit NUMERIC(12,2) DEFAULT 0 CHECK (credit >= 0),
    
    -- Customer (denormalized for fast filtering)
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    customer_number TEXT,
    customer_phone TEXT,
    
    -- Source document (for PDF download & opening modal)
    source_table TEXT NOT NULL,
    source_id UUID NOT NULL,
    pdf_url TEXT,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id),
    
    -- Prevent duplicate entries for same source
    UNIQUE(source_table, source_id, entry_type)
);

-- 2. Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_ledger_lead_id ON uv_ledger_entries(lead_id);
CREATE INDEX IF NOT EXISTS idx_ledger_customer_name ON uv_ledger_entries(customer_name);
CREATE INDEX IF NOT EXISTS idx_ledger_customer_number ON uv_ledger_entries(customer_number);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_date ON uv_ledger_entries(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_type ON uv_ledger_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_ledger_document_number ON uv_ledger_entries(document_number);
CREATE INDEX IF NOT EXISTS idx_ledger_posted_at ON uv_ledger_entries(posted_at DESC);

-- 3. Trigger: When INVOICE is created → add ledger entry
CREATE OR REPLACE FUNCTION ledger_on_invoice_created()
RETURNS TRIGGER AS $$
DECLARE
    v_lead RECORD;
    v_lead_id UUID;
BEGIN
    -- Get lead_id from sales order
    SELECT so.lead_id INTO v_lead_id
    FROM uv_sales_orders so
    WHERE so.id = NEW.sales_order_id;
    
    -- Get customer details
    SELECT full_name, customer_number, phone_number 
    INTO v_lead
    FROM leads 
    WHERE id = v_lead_id;
    
    -- Insert ledger entry
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
        NEW.invoice_date,
        'invoice',
        NEW.invoice_number,
        'Invoice',
        NEW.total_amount,
        0,
        v_lead_id,
        COALESCE(v_lead.full_name, 'Unknown'),
        v_lead.customer_number,
        v_lead.phone_number,
        'uv_invoices',
        NEW.id,
        NEW.pdf_url,
        NEW.created_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_invoice_created ON uv_invoices;
CREATE TRIGGER trg_ledger_invoice_created
    AFTER INSERT ON uv_invoices
    FOR EACH ROW
    EXECUTE FUNCTION ledger_on_invoice_created();

-- 4. NOTE: We do NOT create invoice_reversal entries
-- The reverse_invoice function creates a Credit Note which handles the accounting
-- Creating a separate reversal entry would cause double-counting
-- Credit Notes with reason "Invoice Reversal: ..." show up in ledger automatically

-- 5. Trigger: When PAYMENT is created → add ledger entry
CREATE OR REPLACE FUNCTION ledger_on_payment_created()
RETURNS TRIGGER AS $$
DECLARE
    v_lead RECORD;
BEGIN
    -- Get customer details
    SELECT full_name, customer_number, phone_number 
    INTO v_lead
    FROM leads 
    WHERE id = NEW.lead_id;
    
    -- Insert ledger entry
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
        NEW.payment_date,
        'payment',
        NEW.payment_number,
        'Payment (' || NEW.payment_method || ')',
        0,
        NEW.amount,
        NEW.lead_id,
        COALESCE(v_lead.full_name, 'Unknown'),
        v_lead.customer_number,
        v_lead.phone_number,
        'uv_payments',
        NEW.id,
        NEW.pdf_url,
        NEW.created_by
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_payment_created ON uv_payments;
CREATE TRIGGER trg_ledger_payment_created
    AFTER INSERT ON uv_payments
    FOR EACH ROW
    EXECUTE FUNCTION ledger_on_payment_created();

-- 6. Trigger: When ADJUSTMENT (credit note/refund) is created → add ledger entry
CREATE OR REPLACE FUNCTION ledger_on_adjustment_created()
RETURNS TRIGGER AS $$
DECLARE
    v_lead RECORD;
    v_description TEXT;
    v_debit NUMERIC(12,2);
    v_credit NUMERIC(12,2);
BEGIN
    -- Get customer details
    SELECT full_name, customer_number, phone_number 
    INTO v_lead
    FROM leads 
    WHERE id = NEW.lead_id;
    
    -- Set amounts and description based on type
    IF NEW.adjustment_type = 'credit_note' THEN
        v_debit := 0;
        v_credit := NEW.amount;
        v_description := 'Credit Note: ' || NEW.reason;
    ELSE -- refund
        v_debit := NEW.amount;
        v_credit := 0;
        v_description := 'Refund (' || COALESCE(NEW.refund_method, 'N/A') || '): ' || NEW.reason;
    END IF;
    
    -- Insert ledger entry
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

DROP TRIGGER IF EXISTS trg_ledger_adjustment_created ON uv_adjustments;
CREATE TRIGGER trg_ledger_adjustment_created
    AFTER INSERT ON uv_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION ledger_on_adjustment_created();

-- 7. Trigger: Update PDF URL when document is updated
CREATE OR REPLACE FUNCTION ledger_update_pdf_url()
RETURNS TRIGGER AS $$
BEGIN
    -- Update ledger entry with new PDF URL
    UPDATE uv_ledger_entries
    SET pdf_url = NEW.pdf_url
    WHERE source_table = TG_TABLE_NAME
    AND source_id = NEW.id
    AND pdf_url IS DISTINCT FROM NEW.pdf_url;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PDF update triggers for each table
DROP TRIGGER IF EXISTS trg_ledger_invoice_pdf ON uv_invoices;
CREATE TRIGGER trg_ledger_invoice_pdf
    AFTER UPDATE OF pdf_url ON uv_invoices
    FOR EACH ROW
    WHEN (NEW.pdf_url IS DISTINCT FROM OLD.pdf_url)
    EXECUTE FUNCTION ledger_update_pdf_url();

DROP TRIGGER IF EXISTS trg_ledger_payment_pdf ON uv_payments;
CREATE TRIGGER trg_ledger_payment_pdf
    AFTER UPDATE OF pdf_url ON uv_payments
    FOR EACH ROW
    WHEN (NEW.pdf_url IS DISTINCT FROM OLD.pdf_url)
    EXECUTE FUNCTION ledger_update_pdf_url();

DROP TRIGGER IF EXISTS trg_ledger_adjustment_pdf ON uv_adjustments;
CREATE TRIGGER trg_ledger_adjustment_pdf
    AFTER UPDATE OF pdf_url ON uv_adjustments
    FOR EACH ROW
    WHEN (NEW.pdf_url IS DISTINCT FROM OLD.pdf_url)
    EXECUTE FUNCTION ledger_update_pdf_url();

-- 8. Function to get ledger summary
CREATE OR REPLACE FUNCTION get_ledger_summary_v2(
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL,
    p_lead_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_invoiced NUMERIC,
    total_paid NUMERIC,
    total_credit_notes NUMERIC,
    total_refunds NUMERIC,
    net_receivables NUMERIC,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN entry_type = 'invoice' THEN le.debit ELSE 0 END), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN entry_type = 'payment' THEN le.credit ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN entry_type = 'credit_note' THEN le.credit ELSE 0 END), 0) as total_credit_notes,
        COALESCE(SUM(CASE WHEN entry_type = 'refund' THEN le.debit ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(le.debit - le.credit), 0) as net_receivables,
        COUNT(*) as transaction_count
    FROM uv_ledger_entries le
    WHERE (p_from_date IS NULL OR le.transaction_date >= p_from_date)
    AND (p_to_date IS NULL OR le.transaction_date <= p_to_date)
    AND (p_lead_id IS NULL OR le.lead_id = p_lead_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Enable RLS
ALTER TABLE uv_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view ledger entries" ON uv_ledger_entries;
CREATE POLICY "Users can view ledger entries" ON uv_ledger_entries
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage ledger entries" ON uv_ledger_entries;
CREATE POLICY "Users can manage ledger entries" ON uv_ledger_entries
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 10. Grant access
GRANT SELECT ON uv_ledger_entries TO authenticated;

-- 11. Comments
COMMENT ON TABLE uv_ledger_entries IS 'Permanent ledger of all financial transactions - auto-populated via triggers';
COMMENT ON COLUMN uv_ledger_entries.posted_at IS 'When this entry was created (immutable for audit)';
COMMENT ON COLUMN uv_ledger_entries.debit IS 'Amount customer owes (invoices, refunds)';
COMMENT ON COLUMN uv_ledger_entries.credit IS 'Amount customer paid/credited (payments, credit notes)';

SELECT 'uv_ledger_entries table created successfully' AS status;
SELECT 'All triggers created successfully' AS status;

