-- =====================================================
-- STEP 4: Link charges and payments to invoices
-- =====================================================
-- 1. Add invoice_id to uv_charges
-- 2. Migrate existing charges to invoices
-- 3. Update payment allocations to link to invoices
-- 4. Create functions to update invoice totals
-- =====================================================

-- =====================================================
-- PART A: CHARGES
-- =====================================================

-- 1. Add invoice_id column to uv_charges
ALTER TABLE uv_charges 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

-- 2. Link existing charges to invoices
-- Each charge is currently linked to reservation_id (deal)
-- Find the invoice for that deal and link it
UPDATE uv_charges c
SET invoice_id = i.id
FROM invoices i
WHERE c.reservation_id = i.deal_id
AND c.invoice_id IS NULL;

-- 3. For charges without an invoice, create one
-- (This handles edge cases where charges exist but no invoice was created)
INSERT INTO invoices (deal_id, invoice_date, status, subtotal, total_amount, paid_amount, created_at)
SELECT DISTINCT 
    c.reservation_id,
    COALESCE(vr.document_date, CURRENT_DATE),
    'pending'::invoice_status_enum,
    0, 0, 0,
    NOW()
FROM uv_charges c
JOIN vehicle_reservations vr ON c.reservation_id = vr.id
WHERE c.invoice_id IS NULL
AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.deal_id = c.reservation_id);

-- Now link those charges
UPDATE uv_charges c
SET invoice_id = i.id
FROM invoices i
WHERE c.reservation_id = i.deal_id
AND c.invoice_id IS NULL;

-- 4. Create index on invoice_id
CREATE INDEX IF NOT EXISTS idx_uv_charges_invoice_id ON uv_charges(invoice_id);

-- =====================================================
-- PART B: PAYMENT ALLOCATIONS
-- =====================================================

-- 1. Add invoice_id to uv_payment_allocations
ALTER TABLE uv_payment_allocations 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE;

-- 2. Link existing allocations to invoices
-- Currently linked to reservation_id (deal), find the invoice
UPDATE uv_payment_allocations pa
SET invoice_id = i.id
FROM invoices i
WHERE pa.reservation_id = i.deal_id
AND pa.invoice_id IS NULL;

-- 3. Create index
CREATE INDEX IF NOT EXISTS idx_uv_payment_allocations_invoice_id ON uv_payment_allocations(invoice_id);

-- =====================================================
-- PART C: UPDATE INVOICE TOTALS FROM CHARGES
-- =====================================================

-- 1. Create function to recalculate invoice totals from charges
CREATE OR REPLACE FUNCTION update_invoice_totals_from_charges()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the invoice totals when charges change
    UPDATE invoices
    SET 
        subtotal = COALESCE((
            SELECT SUM(total_amount) 
            FROM uv_charges 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ), 0),
        vat_amount = COALESCE((
            SELECT SUM(vat_amount) 
            FROM uv_charges 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ), 0),
        total_amount = COALESCE((
            SELECT SUM(total_amount + vat_amount) 
            FROM uv_charges 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ), 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger on uv_charges
DROP TRIGGER IF EXISTS update_invoice_totals_trigger ON uv_charges;
CREATE TRIGGER update_invoice_totals_trigger
    AFTER INSERT OR UPDATE OR DELETE ON uv_charges
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_totals_from_charges();

-- =====================================================
-- PART D: UPDATE INVOICE PAID AMOUNT FROM ALLOCATIONS
-- =====================================================

-- 1. Create function to recalculate paid amount from allocations
CREATE OR REPLACE FUNCTION update_invoice_paid_from_allocations()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the invoice paid_amount when allocations change
    UPDATE invoices
    SET 
        paid_amount = COALESCE((
            SELECT SUM(allocated_amount) 
            FROM uv_payment_allocations 
            WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)
        ), 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger on uv_payment_allocations
DROP TRIGGER IF EXISTS update_invoice_paid_trigger ON uv_payment_allocations;
CREATE TRIGGER update_invoice_paid_trigger
    AFTER INSERT OR UPDATE OR DELETE ON uv_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_paid_from_allocations();

-- =====================================================
-- PART E: RECALCULATE ALL EXISTING INVOICE TOTALS
-- =====================================================

-- Update all invoice totals from their charges
UPDATE invoices i
SET 
    subtotal = COALESCE(charges.subtotal, 0),
    vat_amount = COALESCE(charges.vat, 0),
    total_amount = COALESCE(charges.total, 0)
FROM (
    SELECT 
        invoice_id,
        SUM(total_amount) as subtotal,
        SUM(vat_amount) as vat,
        SUM(total_amount + vat_amount) as total
    FROM uv_charges
    WHERE invoice_id IS NOT NULL
    GROUP BY invoice_id
) charges
WHERE i.id = charges.invoice_id;

-- Update all invoice paid amounts from allocations
UPDATE invoices i
SET paid_amount = COALESCE(allocs.total_paid, 0)
FROM (
    SELECT 
        invoice_id,
        SUM(allocated_amount) as total_paid
    FROM uv_payment_allocations
    WHERE invoice_id IS NOT NULL
    GROUP BY invoice_id
) allocs
WHERE i.id = allocs.invoice_id;

-- =====================================================
-- VERIFY
-- =====================================================

SELECT 'Charges linked to invoices:' as check_type, 
       COUNT(*) as count 
FROM uv_charges WHERE invoice_id IS NOT NULL

UNION ALL

SELECT 'Charges NOT linked:' as check_type, 
       COUNT(*) as count 
FROM uv_charges WHERE invoice_id IS NULL

UNION ALL

SELECT 'Allocations linked to invoices:' as check_type, 
       COUNT(*) as count 
FROM uv_payment_allocations WHERE invoice_id IS NOT NULL;

-- Show sample invoice data
SELECT 
    i.invoice_number,
    i.status,
    i.subtotal,
    i.vat_amount,
    i.total_amount,
    i.paid_amount,
    i.balance_due,
    COUNT(c.id) as charge_count
FROM invoices i
LEFT JOIN uv_charges c ON c.invoice_id = i.id
GROUP BY i.id
ORDER BY i.invoice_number DESC
LIMIT 10;

-- =====================================================
-- RESULT:
-- - Charges now linked to invoices (invoice_id)
-- - Payment allocations linked to invoices
-- - Invoice totals auto-update when charges change
-- - Invoice paid_amount auto-updates when payments allocated
-- =====================================================

