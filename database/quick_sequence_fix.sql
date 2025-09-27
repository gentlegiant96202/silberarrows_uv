-- 🚀 QUICK FIX: Reset Invoice Sequence to Avoid Conflicts

-- 1. Find the highest existing invoice number
SELECT 
    'Current highest invoice number:' as info,
    COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)), 0) as max_number
FROM ifrs_lease_accounting 
WHERE invoice_number LIKE 'INV-LE-%';

-- 2. Reset sequence to be safe (start from 2000 to avoid any conflicts)
SELECT setval('lease_invoice_sequence', 2000, false);

-- 3. Test next value (should be 2000)
SELECT 
    'Next invoice will be:' as info,
    'INV-LE-' || currval('lease_invoice_sequence') as next_invoice_preview;

-- Success message
SELECT 'Invoice sequence reset to start at INV-LE-2000! ✅' as result;
