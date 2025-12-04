-- =====================================================
-- STEP 2: Create invoices table
-- =====================================================
-- Invoices are separate from deals. One deal can have multiple invoices
-- (e.g., original invoice reversed, new invoice issued)
-- Invoice is generated UPFRONT when deal starts, not when fully paid
-- =====================================================

-- 1. Create invoice status enum
DO $$ BEGIN
    CREATE TYPE invoice_status_enum AS ENUM (
        'pending',      -- Invoice issued, awaiting payment
        'partial',      -- Partially paid
        'paid',         -- Fully paid
        'reversed',     -- Cancelled/voided
        'refunded'      -- Money returned
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to deal (will be vehicle_deals after rename, currently vehicle_reservations)
    deal_id UUID NOT NULL REFERENCES vehicle_reservations(id) ON DELETE CASCADE,
    
    -- Invoice identification
    invoice_number TEXT UNIQUE NOT NULL,  -- INV-2001
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,  -- Optional payment due date
    
    -- Status tracking
    status invoice_status_enum NOT NULL DEFAULT 'pending',
    
    -- Amounts (calculated from charges)
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance_due NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    
    -- Document storage
    pdf_url TEXT,
    signed_pdf_url TEXT,
    
    -- DocuSign integration
    docusign_envelope_id TEXT,
    signing_status TEXT DEFAULT 'pending',
    
    -- Reversal tracking
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES auth.users(id),
    reversal_reason TEXT,
    replacement_invoice_id UUID REFERENCES invoices(id),  -- Link to new invoice if reversed
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 2000;

-- 4. Create function to auto-generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || nextval('invoice_number_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for invoice number generation
DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON invoices;
CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- 6. Create function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on paid_amount vs total_amount
    IF NEW.paid_amount >= NEW.total_amount AND NEW.total_amount > 0 THEN
        NEW.status := 'paid';
    ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
        NEW.status := 'partial';
    ELSIF NEW.status != 'reversed' AND NEW.status != 'refunded' THEN
        NEW.status := 'pending';
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-update status
DROP TRIGGER IF EXISTS update_invoice_status_trigger ON invoices;
CREATE TRIGGER update_invoice_status_trigger
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_status();

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_deal_id ON invoices(deal_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);

-- 9. Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies
DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
CREATE POLICY "Users can view invoices" ON invoices
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage invoices" ON invoices;
CREATE POLICY "Users can manage invoices" ON invoices
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 11. Migrate existing invoice data from vehicle_reservations
-- Create invoice records for existing reservations that have document_number starting with 'INV-'
INSERT INTO invoices (
    deal_id,
    invoice_number,
    invoice_date,
    status,
    subtotal,
    total_amount,
    paid_amount,
    pdf_url,
    signed_pdf_url,
    docusign_envelope_id,
    signing_status,
    created_at,
    created_by
)
SELECT 
    vr.id as deal_id,
    vr.document_number as invoice_number,
    vr.document_date as invoice_date,
    CASE 
        WHEN vr.document_status = 'reversed' THEN 'reversed'::invoice_status_enum
        WHEN vr.amount_due <= 0 THEN 'paid'::invoice_status_enum
        WHEN vr.deposit > 0 AND vr.amount_due > 0 THEN 'partial'::invoice_status_enum
        ELSE 'pending'::invoice_status_enum
    END as status,
    vr.invoice_total as subtotal,
    vr.invoice_total as total_amount,
    vr.deposit as paid_amount,
    vr.invoice_pdf_url as pdf_url,
    vr.signed_pdf_url as signed_pdf_url,
    vr.docusign_envelope_id,
    vr.signing_status,
    vr.created_at,
    vr.created_by
FROM vehicle_reservations vr
WHERE vr.document_number LIKE 'INV-%'
AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.invoice_number = vr.document_number
);

-- 12. Also create invoice records for reservations (RES-) that should have invoices
-- These are deals that exist but may not have been "invoiced" yet
INSERT INTO invoices (
    deal_id,
    invoice_date,
    status,
    subtotal,
    total_amount,
    paid_amount,
    pdf_url,
    created_at,
    created_by
)
SELECT 
    vr.id as deal_id,
    vr.document_date as invoice_date,
    CASE 
        WHEN vr.document_status = 'reversed' THEN 'reversed'::invoice_status_enum
        WHEN vr.amount_due <= 0 THEN 'paid'::invoice_status_enum
        WHEN vr.deposit > 0 AND vr.amount_due > 0 THEN 'partial'::invoice_status_enum
        ELSE 'pending'::invoice_status_enum
    END as status,
    vr.invoice_total as subtotal,
    vr.invoice_total as total_amount,
    vr.deposit as paid_amount,
    vr.reservation_pdf_url as pdf_url,
    vr.created_at,
    vr.created_by
FROM vehicle_reservations vr
WHERE vr.document_number LIKE 'RES-%'
AND NOT EXISTS (
    SELECT 1 FROM invoices i WHERE i.deal_id = vr.id
);

-- 13. Update sequence to be higher than any migrated invoice numbers
DO $$
DECLARE
    max_inv_num INTEGER;
BEGIN
    SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM 5)::INTEGER), 1999)
    INTO max_inv_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-%';
    
    PERFORM setval('invoice_number_seq', max_inv_num + 1, false);
    RAISE NOTICE 'Set invoice_number_seq to start at %', max_inv_num + 1;
END $$;

-- 14. Verify migration
SELECT 'Invoices created:' as check_type, COUNT(*) as count FROM invoices
UNION ALL
SELECT 'Pending invoices:' as check_type, COUNT(*) FROM invoices WHERE status = 'pending'
UNION ALL
SELECT 'Paid invoices:' as check_type, COUNT(*) FROM invoices WHERE status = 'paid'
UNION ALL
SELECT 'Reversed invoices:' as check_type, COUNT(*) FROM invoices WHERE status = 'reversed';

-- Show sample data
SELECT 
    invoice_number,
    status,
    total_amount,
    paid_amount,
    balance_due,
    invoice_date
FROM invoices
ORDER BY invoice_number DESC
LIMIT 10;

-- =====================================================
-- RESULT:
-- - invoices table created
-- - INV-XXXX auto-generated
-- - Status auto-updates based on payments
-- - Existing data migrated
-- - Multiple invoices per deal now supported!
-- =====================================================

