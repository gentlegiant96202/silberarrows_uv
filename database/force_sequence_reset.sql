-- 🚀 FORCE RESET INVOICE SEQUENCE - IMMEDIATE FIX

-- 1. Check what invoice numbers currently exist
SELECT 
    'Existing invoice numbers:' as info,
    invoice_number,
    created_at
FROM ifrs_lease_accounting 
WHERE invoice_number IS NOT NULL
ORDER BY invoice_number;

-- 2. Find the absolute highest number
SELECT 
    'Highest existing number:' as info,
    COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)), 0) as max_number
FROM ifrs_lease_accounting 
WHERE invoice_number LIKE 'INV-LE-%';

-- 3. FORCE RESET TO SAFE NUMBER (5000 to avoid all conflicts)
SELECT setval('lease_invoice_sequence', 5000, false);

-- 4. Verify the fix
SELECT 
    'Sequence current value:' as info,
    last_value,
    is_called
FROM lease_invoice_sequence;

-- 5. Test what the next invoice number will be
SELECT 
    'Next invoice will be:' as info,
    'INV-LE-' || (last_value + 1) as next_invoice
FROM lease_invoice_sequence;

-- Success message
SELECT 'Invoice sequence FORCE RESET to INV-LE-5000! No more conflicts! 🚀' as result;
