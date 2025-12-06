-- =====================================================
-- DIAGNOSE UV-INV-1005 SPECIFICALLY
-- =====================================================

-- 1. Get the invoice details
SELECT 
    inv.id as invoice_id,
    inv.invoice_number,
    inv.total_amount,
    inv.paid_amount,
    inv.credit_note_total,
    inv.balance_due,
    inv.status,
    inv.reversed_at,
    inv.reversal_reason,
    so.lead_id
FROM uv_invoices inv
JOIN uv_sales_orders so ON inv.sales_order_id = so.id
WHERE inv.invoice_number = 'UV-INV-1005';

-- 2. Get ALL credit notes for this invoice (not just reversal ones)
SELECT 
    adj.id,
    adj.adjustment_number,
    adj.amount,
    adj.reason,
    adj.invoice_id,
    adj.lead_id,
    adj.created_at
FROM uv_adjustments adj
WHERE adj.invoice_id = (
    SELECT id FROM uv_invoices WHERE invoice_number = 'UV-INV-1005'
)
AND adj.adjustment_type = 'credit_note'
ORDER BY adj.created_at;

-- 3. Get the full SOA for this customer
SELECT 
    transaction_date,
    transaction_type,
    reference,
    description,
    debit,
    credit,
    running_balance
FROM uv_statement_of_account
WHERE lead_id = (
    SELECT so.lead_id 
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id
    WHERE inv.invoice_number = 'UV-INV-1005'
)
ORDER BY transaction_date, reference;

-- 4. Check if there are credit notes with wrong lead_id
-- (Credit notes that reference this invoice but have different lead_id)
SELECT 
    adj.*,
    inv.invoice_number,
    so.lead_id as invoice_lead_id,
    CASE WHEN adj.lead_id != so.lead_id THEN 'LEAD_ID MISMATCH!' ELSE 'OK' END as check_result
FROM uv_adjustments adj
JOIN uv_invoices inv ON adj.invoice_id = inv.id
JOIN uv_sales_orders so ON inv.sales_order_id = so.id
WHERE inv.invoice_number = 'UV-INV-1005';

-- 5. Sum check - what's the actual total of credit notes for this invoice?
SELECT 
    COUNT(*) as credit_note_count,
    SUM(amount) as total_credit_notes
FROM uv_adjustments
WHERE invoice_id = (SELECT id FROM uv_invoices WHERE invoice_number = 'UV-INV-1005')
AND adjustment_type = 'credit_note';

-- 6. Check if there are orphan credit notes (with this lead but no invoice_id)
SELECT *
FROM uv_adjustments
WHERE lead_id = (
    SELECT so.lead_id 
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id
    WHERE inv.invoice_number = 'UV-INV-1005'
)
AND adjustment_type = 'credit_note'
ORDER BY created_at;


