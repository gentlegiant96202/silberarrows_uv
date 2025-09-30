-- 🔍 CHECK EXISTING INVOICE NUMBERS

-- 1. All existing invoice numbers in ifrs_lease_accounting
SELECT 
    'IFRS Invoice Numbers:' as table_name,
    invoice_number,
    billing_period,
    total_amount,
    status,
    created_at
FROM ifrs_lease_accounting 
WHERE invoice_number IS NOT NULL
ORDER BY invoice_number;

-- 2. All existing invoice numbers in old lease_accounting (if it exists)
SELECT 
    'Old Invoice Numbers:' as table_name,
    invoice_id as invoice_number,
    billing_period,
    total_amount,
    status,
    created_at
FROM lease_accounting 
WHERE invoice_id IS NOT NULL
ORDER BY created_at;

-- 3. Count by table
SELECT 
    'IFRS table count:' as info,
    COUNT(*) as invoice_count
FROM ifrs_lease_accounting 
WHERE invoice_number IS NOT NULL;

SELECT 
    'Old table count:' as info,
    COUNT(*) as invoice_count
FROM lease_accounting 
WHERE invoice_id IS NOT NULL;

-- 4. Highest number in each table
SELECT 
    'Highest IFRS invoice number:' as info,
    COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)), 0) as max_number
FROM ifrs_lease_accounting 
WHERE invoice_number LIKE 'INV-LE-%';

-- 5. Current sequence status
SELECT 
    'Current sequence:' as info,
    last_value,
    is_called
FROM lease_invoice_sequence;
