-- =====================================================
-- UV ACCOUNTING SYSTEM - COMPLETE DATABASE SCHEMA
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. UV DEALS TABLE
-- Main deal record, auto-created when lead moves to RESERVED
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_deals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to CRM lead
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Customer Invoice Number (gapless: UV-CIN-1000 onwards)
    deal_number TEXT UNIQUE,
    
    -- Invoice number (only assigned when invoice PDF is generated)
    invoice_number TEXT UNIQUE,
    invoice_url TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
    
    -- Customer information (pre-filled from lead)
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_id_type TEXT CHECK (customer_id_type IN ('EID', 'Passport')),
    customer_id_number TEXT,
    
    -- Vehicle (from lead's selected inventory car)
    vehicle_id UUID REFERENCES cars(id),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uv_deals_lead_id ON uv_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_uv_deals_status ON uv_deals(status);
CREATE INDEX IF NOT EXISTS idx_uv_deals_created_at ON uv_deals(created_at DESC);

-- =====================================================
-- 2. UV CHARGES TABLE
-- Line items for each deal (vehicle price, add-ons, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_charges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to deal
    deal_id UUID NOT NULL REFERENCES uv_deals(id) ON DELETE CASCADE,
    
    -- Charge details
    charge_type TEXT NOT NULL CHECK (charge_type IN (
        'vehicle_price',
        'rta_fee',
        'insurance',
        'extended_warranty',
        'servicecare_standard',
        'servicecare_premium',
        'ceramic_coating',
        'window_tints',
        'other'
    )),
    description TEXT, -- Required for 'other' type
    amount DECIMAL(12,2) NOT NULL,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uv_charges_deal_id ON uv_charges(deal_id);

-- =====================================================
-- 3. UV TRANSACTIONS TABLE
-- Deposits, payments, credit notes, refunds
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to deal
    deal_id UUID NOT NULL REFERENCES uv_deals(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'deposit',
        'payment', 
        'credit_note',
        'refund'
    )),
    amount DECIMAL(12,2) NOT NULL,
    
    -- Payment method (null for credit notes)
    payment_method TEXT CHECK (payment_method IN (
        'cash',
        'card',
        'bank_transfer',
        'cheque'
    )),
    
    -- Reference
    reference_number TEXT,
    
    -- For credit notes
    reason TEXT,
    
    -- Document (receipt, credit note, refund voucher)
    document_number TEXT,
    document_url TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uv_transactions_deal_id ON uv_transactions(deal_id);
CREATE INDEX IF NOT EXISTS idx_uv_transactions_type ON uv_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_uv_transactions_created_at ON uv_transactions(created_at DESC);

-- =====================================================
-- 4. UV FINANCE APPLICATIONS TABLE
-- Bank finance tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_finance_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to deal
    deal_id UUID NOT NULL REFERENCES uv_deals(id) ON DELETE CASCADE,
    
    -- Bank details
    bank_name TEXT NOT NULL,
    loan_amount DECIMAL(12,2),
    application_date DATE,
    application_ref TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'documents_ready' CHECK (status IN (
        'documents_ready',
        'submitted',
        'under_review',
        'approved',
        'payment_received',
        'rejected'
    )),
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uv_finance_deal_id ON uv_finance_applications(deal_id);

-- =====================================================
-- 5. UV FINANCE DOCUMENTS TABLE
-- Document uploads for finance applications
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_finance_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Link to finance application
    finance_id UUID NOT NULL REFERENCES uv_finance_applications(id) ON DELETE CASCADE,
    
    -- Document details
    document_type TEXT NOT NULL CHECK (document_type IN (
        'eid_front',
        'eid_back',
        'passport',
        'visa',
        'salary_certificate',
        'bank_statements',
        'trade_license',
        'vehicle_quotation',
        'other'
    )),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    
    -- Audit
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_uv_finance_docs_finance_id ON uv_finance_documents(finance_id);

-- =====================================================
-- 6. UV DOCUMENT SEQUENCES TABLE
-- Gapless document numbering
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_document_sequences (
    document_type TEXT PRIMARY KEY CHECK (document_type IN (
        'deal',
        'invoice',
        'receipt', 
        'credit_note',
        'refund'
    )),
    prefix TEXT NOT NULL,
    last_number INTEGER NOT NULL DEFAULT 999
);

-- Insert initial sequence values (starting at 999, first number will be 1000)
INSERT INTO uv_document_sequences (document_type, prefix, last_number) VALUES
    ('deal', 'UV-CIN', 999),
    ('invoice', 'UV-INV', 999),
    ('receipt', 'UV-REC', 999),
    ('credit_note', 'UV-CN', 999),
    ('refund', 'UV-REF', 999)
ON CONFLICT (document_type) DO NOTHING;

-- =====================================================
-- 7. FUNCTION: Get Next Document Number (Gapless)
-- Uses row-level locking to prevent gaps
-- =====================================================
CREATE OR REPLACE FUNCTION get_next_uv_document_number(p_document_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_next_number INTEGER;
    v_document_number TEXT;
BEGIN
    -- Lock the row and get next number
    UPDATE uv_document_sequences
    SET last_number = last_number + 1
    WHERE document_type = p_document_type
    RETURNING prefix, last_number INTO v_prefix, v_next_number;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid document type: %', p_document_type;
    END IF;
    
    -- Format: PREFIX-NUMBER (e.g., UV-REC-1000)
    v_document_number := v_prefix || '-' || v_next_number::TEXT;
    
    RETURN v_document_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FUNCTION: Create Deal (with auto deal number)
-- =====================================================
CREATE OR REPLACE FUNCTION create_uv_deal(
    p_lead_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_vehicle_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS uv_deals AS $$
DECLARE
    v_deal uv_deals;
    v_deal_number TEXT;
BEGIN
    -- Get next deal number (using 'deal' sequence, not 'invoice')
    v_deal_number := get_next_uv_document_number('deal');
    
    -- Insert deal
    INSERT INTO uv_deals (
        lead_id,
        deal_number,
        customer_name,
        customer_phone,
        vehicle_id,
        created_by
    ) VALUES (
        p_lead_id,
        v_deal_number,
        p_customer_name,
        p_customer_phone,
        p_vehicle_id,
        p_created_by
    )
    RETURNING * INTO v_deal;
    
    RETURN v_deal;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. FUNCTION: Add Transaction (with auto document number)
-- =====================================================
CREATE OR REPLACE FUNCTION add_uv_transaction(
    p_deal_id UUID,
    p_transaction_type TEXT,
    p_amount DECIMAL,
    p_payment_method TEXT DEFAULT NULL,
    p_reference_number TEXT DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS uv_transactions AS $$
DECLARE
    v_transaction uv_transactions;
    v_document_number TEXT;
    v_doc_type TEXT;
BEGIN
    -- Determine document type based on transaction type
    CASE p_transaction_type
        WHEN 'deposit' THEN v_doc_type := 'receipt';
        WHEN 'payment' THEN v_doc_type := 'receipt';
        WHEN 'credit_note' THEN v_doc_type := 'credit_note';
        WHEN 'refund' THEN v_doc_type := 'refund';
        ELSE RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type;
    END CASE;
    
    -- Get next document number
    v_document_number := get_next_uv_document_number(v_doc_type);
    
    -- Insert transaction
    INSERT INTO uv_transactions (
        deal_id,
        transaction_type,
        amount,
        payment_method,
        reference_number,
        reason,
        document_number,
        created_by
    ) VALUES (
        p_deal_id,
        p_transaction_type,
        p_amount,
        p_payment_method,
        p_reference_number,
        p_reason,
        v_document_number,
        p_created_by
    )
    RETURNING * INTO v_transaction;
    
    -- Update deal status based on new balance
    PERFORM update_uv_deal_status(p_deal_id);
    
    RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. FUNCTION: Calculate Deal Balance
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_uv_deal_balance(p_deal_id UUID)
RETURNS TABLE (
    invoice_total DECIMAL,
    total_paid DECIMAL,
    total_credits DECIMAL,
    total_refunds DECIMAL,
    balance_due DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(c.amount), 0) AS invoice_total,
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('deposit', 'payment') THEN t.amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'credit_note' THEN t.amount ELSE 0 END), 0) AS total_credits,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'refund' THEN t.amount ELSE 0 END), 0) AS total_refunds,
        COALESCE(SUM(c.amount), 0) 
            - COALESCE(SUM(CASE WHEN t.transaction_type IN ('deposit', 'payment') THEN t.amount ELSE 0 END), 0)
            - COALESCE(SUM(CASE WHEN t.transaction_type = 'credit_note' THEN t.amount ELSE 0 END), 0)
            + COALESCE(SUM(CASE WHEN t.transaction_type = 'refund' THEN t.amount ELSE 0 END), 0) AS balance_due
    FROM uv_deals d
    LEFT JOIN uv_charges c ON c.deal_id = d.id
    LEFT JOIN uv_transactions t ON t.deal_id = d.id
    WHERE d.id = p_deal_id
    GROUP BY d.id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. FUNCTION: Update Deal Status Based on Balance
-- =====================================================
CREATE OR REPLACE FUNCTION update_uv_deal_status(p_deal_id UUID)
RETURNS VOID AS $$
DECLARE
    v_balance RECORD;
    v_new_status TEXT;
BEGIN
    -- Get current balance
    SELECT * INTO v_balance FROM calculate_uv_deal_balance(p_deal_id);
    
    -- Determine status
    IF v_balance.invoice_total = 0 THEN
        v_new_status := 'pending';
    ELSIF v_balance.balance_due <= 0 THEN
        v_new_status := 'paid';
    ELSIF v_balance.total_paid > 0 OR v_balance.total_credits > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'pending';
    END IF;
    
    -- Update deal status
    UPDATE uv_deals
    SET status = v_new_status, updated_at = NOW()
    WHERE id = p_deal_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. VIEW: Deal Summary with Balances
-- =====================================================
CREATE OR REPLACE VIEW uv_deal_summary AS
SELECT 
    d.id,
    d.lead_id,
    d.deal_number,
    d.invoice_number,
    d.invoice_url,
    d.status,
    d.customer_name,
    d.customer_phone,
    d.customer_email,
    d.customer_id_type,
    d.customer_id_number,
    d.vehicle_id,
    d.created_at,
    d.created_by,
    -- Vehicle info
    c.stock_number AS vehicle_stock_number,
    c.model_year AS vehicle_year,
    c.vehicle_model,
    c.colour AS vehicle_colour,
    c.chassis_number AS vehicle_chassis,
    c.advertised_price_aed AS vehicle_price,
    -- Calculated totals
    COALESCE(charges.total, 0) AS invoice_total,
    COALESCE(payments.total, 0) AS total_paid,
    COALESCE(credits.total, 0) AS total_credits,
    COALESCE(refunds.total, 0) AS total_refunds,
    COALESCE(charges.total, 0) 
        - COALESCE(payments.total, 0) 
        - COALESCE(credits.total, 0) 
        + COALESCE(refunds.total, 0) AS balance_due
FROM uv_deals d
LEFT JOIN cars c ON c.id = d.vehicle_id
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_charges GROUP BY deal_id
) charges ON charges.deal_id = d.id
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_transactions 
    WHERE transaction_type IN ('deposit', 'payment') GROUP BY deal_id
) payments ON payments.deal_id = d.id
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_transactions 
    WHERE transaction_type = 'credit_note' GROUP BY deal_id
) credits ON credits.deal_id = d.id
LEFT JOIN (
    SELECT deal_id, SUM(amount) AS total FROM uv_transactions 
    WHERE transaction_type = 'refund' GROUP BY deal_id
) refunds ON refunds.deal_id = d.id;

-- =====================================================
-- 13. TRIGGERS: Update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_uv_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_uv_deals_updated_at ON uv_deals;
CREATE TRIGGER update_uv_deals_updated_at
    BEFORE UPDATE ON uv_deals
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_updated_at();

DROP TRIGGER IF EXISTS update_uv_charges_updated_at ON uv_charges;
CREATE TRIGGER update_uv_charges_updated_at
    BEFORE UPDATE ON uv_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_updated_at();

DROP TRIGGER IF EXISTS update_uv_finance_updated_at ON uv_finance_applications;
CREATE TRIGGER update_uv_finance_updated_at
    BEFORE UPDATE ON uv_finance_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_updated_at();

-- =====================================================
-- 14. TRIGGER: Update deal status when charges change
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_deal_status_on_charge()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM update_uv_deal_status(OLD.deal_id);
        RETURN OLD;
    ELSE
        PERFORM update_uv_deal_status(NEW.deal_id);
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_deal_status_on_charge ON uv_charges;
CREATE TRIGGER update_deal_status_on_charge
    AFTER INSERT OR UPDATE OR DELETE ON uv_charges
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_deal_status_on_charge();

-- =====================================================
-- 15. RLS POLICIES
-- =====================================================
ALTER TABLE uv_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_finance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_finance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_document_sequences ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "uv_deals_all" ON uv_deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uv_charges_all" ON uv_charges FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uv_transactions_all" ON uv_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uv_finance_applications_all" ON uv_finance_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uv_finance_documents_all" ON uv_finance_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "uv_document_sequences_all" ON uv_document_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- 16. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE uv_deals IS 'Main deal records for UV sales, linked to CRM leads';
COMMENT ON TABLE uv_charges IS 'Line items for each deal (vehicle price, add-ons)';
COMMENT ON TABLE uv_transactions IS 'Financial transactions: deposits, payments, credit notes, refunds';
COMMENT ON TABLE uv_finance_applications IS 'Bank finance application tracking';
COMMENT ON TABLE uv_finance_documents IS 'Document uploads for finance applications';
COMMENT ON TABLE uv_document_sequences IS 'Gapless document numbering sequences';
COMMENT ON FUNCTION get_next_uv_document_number IS 'Returns next gapless document number with row-level locking';
COMMENT ON FUNCTION create_uv_deal IS 'Creates a new deal with auto-generated deal number';
COMMENT ON FUNCTION add_uv_transaction IS 'Adds a transaction with auto-generated document number and updates deal status';
COMMENT ON VIEW uv_deal_summary IS 'Aggregated view of deals with vehicle info and calculated balances';
