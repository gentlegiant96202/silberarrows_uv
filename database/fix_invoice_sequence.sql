-- 🔧 FIX INVOICE SEQUENCE CONFLICT
-- Resolves duplicate key error for invoice numbers

-- 1. Check current sequence value
SELECT 
    'Current sequence value:' as info,
    last_value as current_value,
    is_called
FROM lease_invoice_sequence;

-- 2. Check existing invoice numbers
SELECT 
    'Existing invoice numbers:' as info,
    invoice_number,
    created_at
FROM lease_accounting 
WHERE invoice_number IS NOT NULL
ORDER BY invoice_number;

-- 3. Get the highest existing invoice number
SELECT 
    'Highest existing invoice number:' as info,
    MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)) as max_number
FROM lease_accounting 
WHERE invoice_number LIKE 'INV-LE-%';

-- 4. Reset sequence to be higher than existing invoice numbers
-- Run this to fix the sequence
DO $$
DECLARE
    max_existing INTEGER;
    next_safe_value INTEGER;
BEGIN
    -- Get the highest existing invoice number
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)), 999)
    INTO max_existing
    FROM lease_accounting 
    WHERE invoice_number LIKE 'INV-LE-%';
    
    -- Set next safe value (max existing + 1, minimum 1000)
    next_safe_value := GREATEST(max_existing + 1, 1000);
    
    -- Reset the sequence
    PERFORM setval('lease_invoice_sequence', next_safe_value, false);
    
    RAISE NOTICE 'Sequence reset to start at: %', next_safe_value;
END $$;

-- 5. Verify the fix
SELECT 
    'Next invoice number will be:' as info,
    'INV-LE-' || nextval('lease_invoice_sequence') as next_invoice;

-- Rollback the test
SELECT setval('lease_invoice_sequence', currval('lease_invoice_sequence') - 1, true);

-- Success message
SELECT 'Invoice sequence conflict resolved! ✅' as result;