-- 🔍 DEBUG CREDIT NOTE INSERT
-- This will help us see what values are being inserted

-- Let's check what happens when we try to insert a credit note manually
-- First, let's see what a typical charge looks like
SELECT 
    id,
    charge_type,
    total_amount,
    unit_price,
    quantity,
    status,
    invoice_id
FROM ifrs_lease_accounting 
WHERE charge_type = 'salik' 
  AND status = 'invoiced'
  AND deleted_at IS NULL
LIMIT 1;

-- Now let's test inserting a credit note manually with the same logic
-- (This is just for debugging - don't run this in production)
/*
INSERT INTO ifrs_lease_accounting (
    lease_id,
    billing_period,
    charge_type,
    quantity,
    unit_price,
    total_amount,
    comment,
    invoice_id,
    invoice_number,
    status,
    vat_applicable,
    created_by
) VALUES (
    'test-lease-id'::UUID,
    '2025-01-01'::DATE,
    'credit_note',
    1,
    -100.00,  -- Negative unit price
    -100.00,  -- Negative total amount
    'Test credit note',
    NULL,
    NULL,
    'paid',
    false,
    auth.uid()
);
*/

-- Check if there are any other constraints we missed
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
  AND pg_get_constraintdef(oid) LIKE '%total_amount%'
  AND conname != 'ifrs_valid_amount';
