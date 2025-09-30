-- 🔍 DEBUG INVOICE GENERATION ISSUE

-- 1. Check ALL invoice numbers that exist
SELECT 
    invoice_number,
    lease_id,
    billing_period,
    total_amount,
    status,
    created_at,
    deleted_at
FROM ifrs_lease_accounting 
WHERE invoice_number IS NOT NULL
ORDER BY invoice_number;

-- 2. Check if there are deleted records with same invoice numbers
SELECT 
    'Deleted invoices:' as info,
    invoice_number,
    deleted_at,
    deleted_by
FROM ifrs_lease_accounting 
WHERE invoice_number IS NOT NULL 
AND deleted_at IS NOT NULL
ORDER BY invoice_number;

-- 3. Check the unique constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
AND conname LIKE '%invoice_number%';

-- 4. Check current sequence
SELECT 
    last_value,
    is_called
FROM lease_invoice_sequence;

-- 5. Simple test - what would the next sequence value be?
SELECT nextval('lease_invoice_sequence') as next_sequence_value;

-- Reset the sequence back (undo the test)
SELECT setval('lease_invoice_sequence', currval('lease_invoice_sequence') - 1, true);
