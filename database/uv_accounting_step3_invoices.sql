-- =====================================================
-- UV SALES ACCOUNTING - STEP 3: INVOICES
-- =====================================================
-- Invoices are created from Sales Orders
-- Line items are copied from uv_sales_order_lines
-- Invoice is LOCKED once created (can only be reversed)
-- =====================================================

-- 1. Create a counter table for GAPLESS sequential numbering
-- This ensures no missing numbers (unlike sequences which can have gaps)
CREATE TABLE IF NOT EXISTS uv_document_counters (
    document_type TEXT PRIMARY KEY,  -- 'invoice', 'payment', 'credit_note', 'refund'
    last_number INTEGER NOT NULL DEFAULT 1000,
    prefix TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize the invoice counter (starting at 1000, so first invoice will be 1001)
INSERT INTO uv_document_counters (document_type, last_number, prefix)
VALUES ('invoice', 1000, 'UV-INV-')
ON CONFLICT (document_type) DO NOTHING;

-- Function to get next gapless number (with row-level locking)
CREATE OR REPLACE FUNCTION get_next_document_number(p_document_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_next_number INTEGER;
    v_prefix TEXT;
BEGIN
    -- Lock the row and increment in one atomic operation
    UPDATE uv_document_counters
    SET last_number = last_number + 1,
        updated_at = NOW()
    WHERE document_type = p_document_type
    RETURNING last_number, prefix INTO v_next_number, v_prefix;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document type % not found in counters table', p_document_type;
    END IF;
    
    RETURN v_prefix || v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Keep the sequence as fallback (but we won't use it for invoices)
CREATE SEQUENCE IF NOT EXISTS uv_invoice_seq START WITH 1001;

-- 2. Create ENUM for invoice status
DO $$ BEGIN
    CREATE TYPE uv_invoice_status AS ENUM (
        'pending',    -- Invoice issued, awaiting payment
        'partial',    -- Partially paid
        'paid',       -- Fully paid
        'reversed'    -- Cancelled/voided (kept for audit)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create the Invoices table
CREATE TABLE IF NOT EXISTS uv_invoices (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,  -- UV-INV-1001 (auto-generated)
    
    -- Link to Sales Order
    sales_order_id UUID NOT NULL REFERENCES uv_sales_orders(id) ON DELETE CASCADE,
    
    -- Document metadata
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,  -- Optional payment due date
    
    -- Status
    status uv_invoice_status NOT NULL DEFAULT 'pending',
    
    -- Amounts (copied from Sales Order, then maintained separately)
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    balance_due NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    
    -- Document storage
    pdf_url TEXT,
    signed_pdf_url TEXT,
    
    -- DocuSign integration (optional)
    docusign_envelope_id TEXT,
    signing_status TEXT DEFAULT 'pending',
    
    -- Reversal tracking
    reversed_at TIMESTAMPTZ,
    reversed_by UUID REFERENCES auth.users(id),
    reversal_reason TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4. Create trigger function to auto-generate invoice number (GAPLESS)
CREATE OR REPLACE FUNCTION generate_uv_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        -- Use the gapless counter function instead of sequence
        NEW.invoice_number := get_next_document_number('invoice');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for auto-numbering
DROP TRIGGER IF EXISTS trg_generate_uv_invoice_number ON uv_invoices;
CREATE TRIGGER trg_generate_uv_invoice_number
    BEFORE INSERT ON uv_invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_uv_invoice_number();

-- 6. Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_uv_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_uv_invoices_updated_at ON uv_invoices;
CREATE TRIGGER trg_update_uv_invoices_updated_at
    BEFORE UPDATE ON uv_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_invoices_updated_at();

-- 8. Create Invoice Line Items table (copied from Sales Order lines)
CREATE TABLE IF NOT EXISTS uv_invoice_lines (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to Invoice
    invoice_id UUID NOT NULL REFERENCES uv_invoices(id) ON DELETE CASCADE,
    
    -- Original Sales Order line reference (for tracing)
    source_line_id UUID REFERENCES uv_sales_order_lines(id) ON DELETE SET NULL,
    
    -- Line item details (copied from SO lines)
    line_type uv_line_type NOT NULL DEFAULT 'other',
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Display order
    sort_order INTEGER NOT NULL DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create function to convert Sales Order to Invoice
CREATE OR REPLACE FUNCTION convert_so_to_invoice(
    p_sales_order_id UUID,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_invoice_id UUID;
    v_so RECORD;
BEGIN
    -- Get Sales Order details
    SELECT * INTO v_so
    FROM uv_sales_orders
    WHERE id = p_sales_order_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales Order not found';
    END IF;
    
    -- Check if invoice already exists for this SO
    IF EXISTS (
        SELECT 1 FROM uv_invoices 
        WHERE sales_order_id = p_sales_order_id 
        AND status != 'reversed'
    ) THEN
        RAISE EXCEPTION 'An active invoice already exists for this Sales Order';
    END IF;
    
    -- Create the invoice
    INSERT INTO uv_invoices (
        sales_order_id,
        invoice_date,
        subtotal,
        total_amount,
        created_by
    ) VALUES (
        p_sales_order_id,
        CURRENT_DATE,
        v_so.subtotal,
        v_so.total_amount,
        p_created_by
    ) RETURNING id INTO v_invoice_id;
    
    -- Copy line items from Sales Order to Invoice
    INSERT INTO uv_invoice_lines (
        invoice_id,
        source_line_id,
        line_type,
        description,
        quantity,
        unit_price,
        line_total,
        sort_order
    )
    SELECT 
        v_invoice_id,
        id,  -- source_line_id
        line_type,
        description,
        quantity,
        unit_price,
        line_total,
        sort_order
    FROM uv_sales_order_lines
    WHERE sales_order_id = p_sales_order_id
    ORDER BY sort_order;
    
    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Create function to reverse an invoice
CREATE OR REPLACE FUNCTION reverse_invoice(
    p_invoice_id UUID,
    p_reason TEXT,
    p_reversed_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE uv_invoices
    SET 
        status = 'reversed',
        reversed_at = NOW(),
        reversed_by = p_reversed_by,
        reversal_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_invoice_id
    AND status != 'reversed';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found or already reversed';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update status based on paid_amount vs total_amount
    IF NEW.paid_amount >= NEW.total_amount AND NEW.total_amount > 0 THEN
        NEW.status := 'paid';
    ELSIF NEW.paid_amount > 0 AND NEW.paid_amount < NEW.total_amount THEN
        NEW.status := 'partial';
    ELSIF NEW.status NOT IN ('reversed') THEN
        NEW.status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. Create trigger to auto-update invoice status
DROP TRIGGER IF EXISTS trg_update_invoice_payment_status ON uv_invoices;
CREATE TRIGGER trg_update_invoice_payment_status
    BEFORE UPDATE OF paid_amount ON uv_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uv_invoices_sales_order_id ON uv_invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_uv_invoices_status ON uv_invoices(status);
CREATE INDEX IF NOT EXISTS idx_uv_invoices_invoice_date ON uv_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_uv_invoice_lines_invoice_id ON uv_invoice_lines(invoice_id);

-- 14. Enable RLS
ALTER TABLE uv_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE uv_invoice_lines ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS policies
DROP POLICY IF EXISTS "Users can view invoices" ON uv_invoices;
CREATE POLICY "Users can view invoices" ON uv_invoices
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage invoices" ON uv_invoices;
CREATE POLICY "Users can manage invoices" ON uv_invoices
    FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view invoice lines" ON uv_invoice_lines;
CREATE POLICY "Users can view invoice lines" ON uv_invoice_lines
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage invoice lines" ON uv_invoice_lines;
CREATE POLICY "Users can manage invoice lines" ON uv_invoice_lines
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 16. Add comments
COMMENT ON TABLE uv_invoices IS 'UV Sales Invoices - Created from Sales Orders, locked once created';
COMMENT ON COLUMN uv_invoices.invoice_number IS 'Auto-generated: UV-INV-1001, UV-INV-1002, etc.';
COMMENT ON COLUMN uv_invoices.balance_due IS 'Auto-calculated: total_amount - paid_amount';
COMMENT ON FUNCTION convert_so_to_invoice IS 'Creates an invoice from a Sales Order, copying all line items';
COMMENT ON FUNCTION reverse_invoice IS 'Reverses an invoice (marks as reversed, keeps for audit)';

-- 17. Add RLS for counter table
ALTER TABLE uv_document_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view counters" ON uv_document_counters;
CREATE POLICY "Users can view counters" ON uv_document_counters
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update counters" ON uv_document_counters;
CREATE POLICY "Users can update counters" ON uv_document_counters
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 18. Verify creation
SELECT 'uv_document_counters table created successfully' AS status;
SELECT 'uv_invoices table created successfully' AS status;
SELECT 'uv_invoice_lines table created successfully' AS status;
SELECT 'convert_so_to_invoice function created' AS status;
SELECT 'reverse_invoice function created' AS status;

-- Show current counter state
SELECT 
    document_type, 
    prefix || (last_number + 1) AS next_number_will_be 
FROM uv_document_counters;

