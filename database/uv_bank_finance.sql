-- =====================================================
-- UV SALES ACCOUNTING - BANK FINANCE MODULE
-- =====================================================
-- Manages bank finance applications, document collection,
-- status tracking, and approval workflow
-- =====================================================

-- 1. Create Bank Finance Applications table
CREATE TABLE IF NOT EXISTS uv_bank_finance_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    sales_order_id UUID NOT NULL REFERENCES uv_sales_orders(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id),
    
    -- Application number (auto-generated per sales order: 1, 2, 3...)
    application_number INT NOT NULL DEFAULT 1,
    
    -- Status workflow
    status TEXT NOT NULL DEFAULT 'documents_pending' CHECK (
        status IN ('documents_pending', 'documents_complete', 'accounts_review', 
                   'submitted_to_bank', 'approved', 'rejected')
    ),
    
    -- ACTUAL DEAL (from Sales Order - what customer really pays)
    actual_vehicle_price NUMERIC(12,2),
    actual_customer_down_payment NUMERIC(12,2) DEFAULT 0,
    amount_to_finance NUMERIC(12,2),
    
    -- BANK QUOTATION (inflated figures for bank)
    bank_name TEXT,
    bank_required_down_pct NUMERIC(5,2),          -- e.g., 20.00 for 20%
    bank_quotation_price NUMERIC(12,2),           -- Inflated price shown to bank
    bank_shown_down_payment NUMERIC(12,2),        -- Calculated from %
    bank_finance_amount NUMERIC(12,2),            -- What bank will finance (100% - down%)
    
    -- Bank quotation document
    bank_quotation_number TEXT,
    bank_quotation_pdf_url TEXT,
    bank_quotation_date DATE,
    bank_quotation_valid_until DATE,
    
    -- Applied terms (what we request from bank)
    applied_interest_rate NUMERIC(5,2),
    applied_tenure_months INT,
    applied_emi NUMERIC(12,2),
    
    -- APPROVED TERMS (filled when bank approves)
    bank_reference TEXT,
    approved_amount NUMERIC(12,2),
    approved_down_payment NUMERIC(12,2),
    approved_interest_rate NUMERIC(5,2),
    approved_tenure_months INT,
    approved_emi NUMERIC(12,2),
    first_emi_date DATE,
    last_emi_date DATE,
    
    -- Rejection
    rejection_reason TEXT,
    
    -- Timestamps for timeline tracking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    docs_started_at TIMESTAMPTZ,
    docs_completed_at TIMESTAMPTZ,
    accounts_received_at TIMESTAMPTZ,
    submitted_to_bank_at TIMESTAMPTZ,
    decision_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_by UUID REFERENCES auth.users(id),
    
    -- Ensure unique application number per sales order
    UNIQUE(sales_order_id, application_number)
);

-- 2. Create Bank Finance Documents table
CREATE TABLE IF NOT EXISTS uv_bank_finance_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to application
    application_id UUID NOT NULL REFERENCES uv_bank_finance_applications(id) ON DELETE CASCADE,
    
    -- Document categorization
    category TEXT NOT NULL CHECK (category IN ('customer', 'bank')),
    document_type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    
    -- File storage
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INT,
    
    -- Audit
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id)
);

-- 3. Create Bank Finance Activity Log table
CREATE TABLE IF NOT EXISTS uv_bank_finance_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to application
    application_id UUID NOT NULL REFERENCES uv_bank_finance_applications(id) ON DELETE CASCADE,
    
    -- Activity details
    activity_type TEXT NOT NULL CHECK (
        activity_type IN ('note', 'status_change', 'document_upload', 'system')
    ),
    note TEXT,
    old_status TEXT,
    new_status TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4. Add document counter for bank quotations
INSERT INTO uv_document_counters (document_type, prefix, last_number)
VALUES ('bank_quotation', 'BQ', 1000)
ON CONFLICT (document_type) DO NOTHING;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bf_app_sales_order ON uv_bank_finance_applications(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_bf_app_lead ON uv_bank_finance_applications(lead_id);
CREATE INDEX IF NOT EXISTS idx_bf_app_status ON uv_bank_finance_applications(status);
CREATE INDEX IF NOT EXISTS idx_bf_docs_app ON uv_bank_finance_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_bf_activity_app ON uv_bank_finance_activity(application_id);

-- 6. Create function to get next application number for a sales order
CREATE OR REPLACE FUNCTION get_next_bf_application_number(p_sales_order_id UUID)
RETURNS INT AS $$
DECLARE
    v_next_number INT;
BEGIN
    SELECT COALESCE(MAX(application_number), 0) + 1
    INTO v_next_number
    FROM uv_bank_finance_applications
    WHERE sales_order_id = p_sales_order_id;
    
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to update timestamps and log status changes
CREATE OR REPLACE FUNCTION bf_application_status_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at := NOW();
    
    -- Set timestamps based on status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        CASE NEW.status
            WHEN 'documents_pending' THEN
                NEW.docs_started_at := COALESCE(NEW.docs_started_at, NOW());
            WHEN 'documents_complete' THEN
                NEW.docs_completed_at := NOW();
            WHEN 'accounts_review' THEN
                NEW.accounts_received_at := NOW();
            WHEN 'submitted_to_bank' THEN
                NEW.submitted_to_bank_at := NOW();
            WHEN 'approved' THEN
                NEW.decision_at := NOW();
            WHEN 'rejected' THEN
                NEW.decision_at := NOW();
            ELSE
                -- No specific timestamp for other statuses
        END CASE;
        
        -- Log the status change
        INSERT INTO uv_bank_finance_activity (
            application_id,
            activity_type,
            old_status,
            new_status,
            created_by
        ) VALUES (
            NEW.id,
            'status_change',
            OLD.status,
            NEW.status,
            auth.uid()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_bf_application_status
    BEFORE UPDATE ON uv_bank_finance_applications
    FOR EACH ROW
    EXECUTE FUNCTION bf_application_status_trigger();

-- 8. Create function to auto-set docs_started_at on insert
CREATE OR REPLACE FUNCTION bf_application_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.docs_started_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bf_application_insert
    BEFORE INSERT ON uv_bank_finance_applications
    FOR EACH ROW
    EXECUTE FUNCTION bf_application_insert_trigger();

-- 9. Enable RLS
ALTER TABLE uv_bank_finance_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_bank_finance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_bank_finance_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for applications
DROP POLICY IF EXISTS "Users can view bank finance applications" ON uv_bank_finance_applications;
CREATE POLICY "Users can view bank finance applications" ON uv_bank_finance_applications
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage bank finance applications" ON uv_bank_finance_applications;
CREATE POLICY "Users can manage bank finance applications" ON uv_bank_finance_applications
    FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for documents
DROP POLICY IF EXISTS "Users can view bank finance documents" ON uv_bank_finance_documents;
CREATE POLICY "Users can view bank finance documents" ON uv_bank_finance_documents
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage bank finance documents" ON uv_bank_finance_documents;
CREATE POLICY "Users can manage bank finance documents" ON uv_bank_finance_documents
    FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for activity
DROP POLICY IF EXISTS "Users can view bank finance activity" ON uv_bank_finance_activity;
CREATE POLICY "Users can view bank finance activity" ON uv_bank_finance_activity
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert bank finance activity" ON uv_bank_finance_activity;
CREATE POLICY "Users can insert bank finance activity" ON uv_bank_finance_activity
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 10. Create view for application summary
CREATE OR REPLACE VIEW uv_bank_finance_summary AS
SELECT 
    app.id,
    app.sales_order_id,
    app.lead_id,
    app.application_number,
    app.status,
    app.bank_name,
    app.bank_finance_amount,
    app.approved_amount,
    app.bank_reference,
    app.rejection_reason,
    app.created_at,
    app.decision_at,
    -- Calculate duration
    CASE 
        WHEN app.decision_at IS NOT NULL THEN 
            app.decision_at - app.created_at
        ELSE 
            NOW() - app.created_at
    END AS processing_duration,
    -- Document counts
    (SELECT COUNT(*) FROM uv_bank_finance_documents d WHERE d.application_id = app.id AND d.category = 'customer') AS customer_docs_count,
    (SELECT COUNT(*) FROM uv_bank_finance_documents d WHERE d.application_id = app.id AND d.category = 'bank') AS bank_docs_count
FROM uv_bank_finance_applications app;

-- 11. Comments
COMMENT ON TABLE uv_bank_finance_applications IS 'Tracks bank finance applications for sales orders, including dual pricing (actual vs bank quotation).';
COMMENT ON TABLE uv_bank_finance_documents IS 'Stores customer documents and bank documents (LOI, LPO) for finance applications.';
COMMENT ON TABLE uv_bank_finance_activity IS 'Activity log for bank finance applications including notes and status changes.';
COMMENT ON VIEW uv_bank_finance_summary IS 'Summary view of bank finance applications with document counts and processing duration.';

-- 12. Verify creation
SELECT 'uv_bank_finance_applications table created' AS status;
SELECT 'uv_bank_finance_documents table created' AS status;
SELECT 'uv_bank_finance_activity table created' AS status;
SELECT 'Bank finance module ready!' AS status;


