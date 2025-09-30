-- 🔍 CHECK EXISTING IFRS INVOICE NUMBERS ONLY

-- 1. All existing invoice numbers in ifrs_lease_accounting
SELECT 
    'IFRS Invoice Numbers:' as info,
    invoice_number,
    billing_period,
    total_amount,
    status,
    created_at
FROM ifrs_lease_accounting 
WHERE invoice_number IS NOT NULL
ORDER BY invoice_number;

-- 2. Count of invoices
SELECT 
    'Total invoices:' as info,
    COUNT(*) as invoice_count
FROM ifrs_lease_accounting 
WHERE invoice_number IS NOT NULL;

-- 3. Highest existing invoice number
SELECT 
    'Highest existing number:' as info,
    COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)), 0) as max_number
FROM ifrs_lease_accounting 
WHERE invoice_number LIKE 'INV-LE-%';

-- 4. Current sequence status
SELECT 
    'Current sequence:' as info,
    last_value,
    is_called
FROM lease_invoice_sequence;

-- 5. What the next invoice number would be
SELECT 
    'Next invoice would be:' as info,
    'INV-LE-' || (last_value + CASE WHEN is_called THEN 1 ELSE 0 END) as next_invoice
FROM lease_invoice_sequence;
