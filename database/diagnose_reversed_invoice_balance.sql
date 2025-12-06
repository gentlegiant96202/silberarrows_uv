-- =====================================================
-- DIAGNOSE REVERSED INVOICE BALANCE ISSUE
-- =====================================================
-- Run this in Supabase SQL Editor to check why a reversed
-- invoice still shows a balance
-- =====================================================

-- 1. First, find all reversed invoices
SELECT 
    inv.invoice_number,
    inv.total_amount,
    inv.paid_amount,
    inv.credit_note_total,
    inv.balance_due,
    inv.status,
    inv.reversed_at,
    inv.reversal_reason,
    so.lead_id,
    l.full_name as customer_name
FROM uv_invoices inv
JOIN uv_sales_orders so ON inv.sales_order_id = so.id
JOIN leads l ON so.lead_id = l.id
WHERE inv.status = 'reversed'
ORDER BY inv.reversed_at DESC;

-- 2. Check if credit notes exist for reversed invoices
SELECT 
    inv.invoice_number,
    inv.total_amount as invoice_amount,
    inv.status as invoice_status,
    adj.adjustment_number as credit_note_number,
    adj.amount as credit_note_amount,
    adj.reason,
    adj.created_at as cn_created_at
FROM uv_invoices inv
JOIN uv_sales_orders so ON inv.sales_order_id = so.id
LEFT JOIN uv_adjustments adj ON adj.invoice_id = inv.id AND adj.adjustment_type = 'credit_note'
WHERE inv.status = 'reversed'
ORDER BY inv.invoice_number;

-- 3. Check the SOA for a specific customer (replace the lead_id)
-- Find customers with reversed invoices first:
SELECT DISTINCT 
    so.lead_id,
    l.full_name
FROM uv_invoices inv
JOIN uv_sales_orders so ON inv.sales_order_id = so.id
JOIN leads l ON so.lead_id = l.id
WHERE inv.status = 'reversed';

-- 4. Then check their full SOA (replace 'LEAD_ID_HERE' with actual UUID):
-- SELECT * FROM uv_statement_of_account WHERE lead_id = 'LEAD_ID_HERE' ORDER BY transaction_date;

-- 5. Check if the reverse_invoice function exists and what version
SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'reverse_invoice';

-- 6. Check total credit notes vs expected
SELECT 
    'Reversed Invoices Total' as metric,
    SUM(total_amount) as amount
FROM uv_invoices 
WHERE status = 'reversed'
UNION ALL
SELECT 
    'Credit Notes for Reversals' as metric,
    SUM(amount) as amount
FROM uv_adjustments 
WHERE adjustment_type = 'credit_note' 
AND reason LIKE '%Reversal%';

-- 7. Find mismatches - reversed invoices without matching credit notes
SELECT 
    inv.invoice_number,
    inv.total_amount as invoice_total,
    inv.paid_amount,
    (inv.total_amount - COALESCE(inv.credit_note_total, 0)) as expected_cn_for_reversal,
    COALESCE(SUM(adj.amount), 0) as actual_cn_amount,
    CASE 
        WHEN (inv.total_amount - COALESCE(inv.credit_note_total, 0)) = COALESCE(SUM(adj.amount), 0) 
        THEN 'OK' 
        ELSE 'MISMATCH!' 
    END as status
FROM uv_invoices inv
JOIN uv_sales_orders so ON inv.sales_order_id = so.id
LEFT JOIN uv_adjustments adj ON adj.invoice_id = inv.id 
    AND adj.adjustment_type = 'credit_note'
    AND adj.reason LIKE '%Reversal%'
WHERE inv.status = 'reversed'
GROUP BY inv.id, inv.invoice_number, inv.total_amount, inv.paid_amount, inv.credit_note_total;


