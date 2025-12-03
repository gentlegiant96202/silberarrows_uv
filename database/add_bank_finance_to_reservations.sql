-- =====================================================
-- BANK FINANCE TRACKING FOR VEHICLE RESERVATIONS
-- =====================================================
-- Adds columns for tracking cash vs finance sales
-- and bank finance application progress
-- =====================================================

-- 1. BANKS LOOKUP TABLE (small, for dropdown consistency)
-- =====================================================
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert common UAE banks
INSERT INTO banks (name) VALUES 
    ('Emirates NBD'),
    ('ADCB'),
    ('FAB (First Abu Dhabi Bank)'),
    ('RAK Bank'),
    ('Dubai Islamic Bank'),
    ('Mashreq'),
    ('ENBD Islamic'),
    ('Abu Dhabi Islamic Bank'),
    ('Commercial Bank of Dubai'),
    ('National Bank of Fujairah'),
    ('Sharjah Islamic Bank'),
    ('Al Hilal Bank'),
    ('Ajman Bank')
ON CONFLICT (name) DO NOTHING;

-- RLS for banks table
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view banks" ON banks
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage banks" ON banks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 2. ADD FINANCE COLUMNS TO VEHICLE_RESERVATIONS
-- =====================================================

-- Sale type: cash or finance
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS sale_type TEXT DEFAULT 'cash' 
CHECK (sale_type IN ('cash', 'finance'));

-- Bank reference (can be bank_id or free text for unlisted banks)
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_bank_id UUID REFERENCES banks(id);

ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_bank_name TEXT; -- For banks not in list

-- Downpayment tracking
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS downpayment_percent DECIMAL(5,2) DEFAULT 20;

ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS downpayment_amount DECIMAL(12,2);

ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_amount DECIMAL(12,2);

-- Finance application status
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_status TEXT DEFAULT 'pending_docs'
CHECK (finance_status IN (
    'pending_docs',    -- Need customer documents
    'docs_ready',      -- All docs uploaded
    'submitted',       -- Sent to bank
    'under_review',    -- Bank is reviewing
    'approved',        -- Bank approved
    'rejected',        -- Bank rejected
    'funds_received'   -- Bank paid (deal complete)
));

-- Bank reference number
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_bank_reference TEXT;

-- Timestamps
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_submitted_at TIMESTAMPTZ;

ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_approved_at TIMESTAMPTZ;

ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_rejected_at TIMESTAMPTZ;

-- Documents stored as JSONB array
-- Format: [{ "type": "emirates_id_front", "url": "https://...", "uploaded_at": "2024-12-03", "uploaded_by": "uuid" }]
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_documents JSONB DEFAULT '[]'::jsonb;

-- Notes/comments for finance application
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_notes TEXT;

-- Rejection reason (if rejected)
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS finance_rejection_reason TEXT;

-- 3. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_sale_type 
ON vehicle_reservations(sale_type);

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_finance_status 
ON vehicle_reservations(finance_status) 
WHERE sale_type = 'finance';

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_finance_bank 
ON vehicle_reservations(finance_bank_id) 
WHERE sale_type = 'finance';

-- 4. HELPER FUNCTION: Calculate finance amounts
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_finance_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate for finance sales
    IF NEW.sale_type = 'finance' THEN
        -- Use invoice_total as the base amount
        IF NEW.invoice_total IS NOT NULL AND NEW.invoice_total > 0 THEN
            -- Calculate downpayment amount from percentage
            NEW.downpayment_amount := ROUND(NEW.invoice_total * (COALESCE(NEW.downpayment_percent, 20) / 100), 2);
            -- Finance amount is the remainder
            NEW.finance_amount := NEW.invoice_total - NEW.downpayment_amount;
        END IF;
    ELSE
        -- For cash sales, clear finance fields
        NEW.downpayment_amount := NULL;
        NEW.finance_amount := NULL;
        NEW.finance_status := NULL;
        NEW.finance_bank_id := NULL;
        NEW.finance_bank_name := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_calculate_finance_amounts ON vehicle_reservations;
CREATE TRIGGER trg_calculate_finance_amounts
    BEFORE INSERT OR UPDATE OF sale_type, invoice_total, downpayment_percent
    ON vehicle_reservations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_finance_amounts();

-- 5. VIEW: Finance Applications Summary
-- =====================================================
CREATE OR REPLACE VIEW finance_applications_summary AS
SELECT 
    vr.id,
    vr.lead_id,
    vr.customer_name,
    vr.contact_no,
    vr.vehicle_make_model,
    vr.model_year,
    vr.chassis_no,
    vr.invoice_total,
    vr.sale_type,
    vr.downpayment_percent,
    vr.downpayment_amount,
    vr.finance_amount,
    vr.finance_status,
    COALESCE(b.name, vr.finance_bank_name) AS bank_name,
    vr.finance_bank_reference,
    vr.finance_submitted_at,
    vr.finance_approved_at,
    vr.finance_documents,
    vr.finance_notes,
    vr.created_at,
    -- Document count
    jsonb_array_length(COALESCE(vr.finance_documents, '[]'::jsonb)) AS documents_uploaded,
    -- Status label
    CASE vr.finance_status
        WHEN 'pending_docs' THEN 'Documents Required'
        WHEN 'docs_ready' THEN 'Documents Ready'
        WHEN 'submitted' THEN 'Submitted to Bank'
        WHEN 'under_review' THEN 'Bank Reviewing'
        WHEN 'approved' THEN 'Approved'
        WHEN 'rejected' THEN 'Rejected'
        WHEN 'funds_received' THEN 'Funds Received'
        ELSE 'Unknown'
    END AS status_label
FROM vehicle_reservations vr
LEFT JOIN banks b ON vr.finance_bank_id = b.id
WHERE vr.sale_type = 'finance';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Bank Finance columns added to vehicle_reservations successfully!' AS result;

