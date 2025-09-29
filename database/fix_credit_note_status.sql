-- Fix credit note status and invoice linking
-- Credit notes are immediately effective adjustments, not pending invoices
-- They should NOT be linked to any invoice

-- Update existing credit notes to have 'paid' status and remove invoice linking
UPDATE ifrs_lease_accounting 
SET status = 'paid', 
    invoice_id = NULL,
    invoice_number = NULL,
    updated_at = NOW()
WHERE charge_type = 'credit_note' 
  AND deleted_at IS NULL;

-- Verify the changes
SELECT 
    charge_type,
    status,
    COUNT(*) as count,
    SUM(total_amount) as total_amount
FROM ifrs_lease_accounting 
WHERE charge_type = 'credit_note' 
  AND deleted_at IS NULL
GROUP BY charge_type, status
ORDER BY charge_type, status;
