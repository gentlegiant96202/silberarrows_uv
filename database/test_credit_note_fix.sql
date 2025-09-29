-- Test script to verify credit note fix
-- This will show how credit notes should appear vs invoices

-- Check current credit notes
SELECT 
    'CREDIT NOTES' as record_type,
    id,
    charge_type,
    total_amount,
    invoice_id,
    invoice_number,
    status,
    comment
FROM ifrs_lease_accounting 
WHERE charge_type = 'credit_note' 
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- Check invoices (should NOT include credit notes)
SELECT 
    'INVOICE CHARGES' as record_type,
    id,
    charge_type,
    total_amount,
    invoice_id,
    invoice_number,
    status,
    comment
FROM ifrs_lease_accounting 
WHERE invoice_id IS NOT NULL 
  AND charge_type != 'credit_note'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

-- Summary counts
SELECT 
    charge_type,
    COUNT(*) as count,
    SUM(total_amount) as total_amount,
    COUNT(CASE WHEN invoice_id IS NOT NULL THEN 1 END) as linked_to_invoice,
    COUNT(CASE WHEN invoice_id IS NULL THEN 1 END) as standalone
FROM ifrs_lease_accounting 
WHERE deleted_at IS NULL
GROUP BY charge_type
ORDER BY charge_type;
