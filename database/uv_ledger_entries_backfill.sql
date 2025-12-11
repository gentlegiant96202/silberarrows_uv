-- =====================================================
-- UV LEDGER ENTRIES - BACKFILL EXISTING DATA
-- =====================================================
-- Run this AFTER creating the uv_ledger_entries table
-- This populates the ledger with all existing transactions
-- =====================================================

-- 1. Backfill INVOICES
INSERT INTO uv_ledger_entries (
    transaction_date,
    entry_type,
    document_number,
    description,
    debit,
    credit,
    lead_id,
    customer_name,
    customer_number,
    customer_phone,
    source_table,
    source_id,
    pdf_url,
    created_by,
    posted_at
)
SELECT 
    inv.invoice_date,
    'invoice',
    inv.invoice_number,
    'Invoice',
    inv.total_amount,
    0,
    so.lead_id,
    COALESCE(l.full_name, 'Unknown'),
    l.customer_number,
    l.phone_number,
    'uv_invoices',
    inv.id,
    inv.pdf_url,
    inv.created_by,
    inv.created_at
FROM uv_invoices inv
JOIN uv_sales_orders so ON inv.sales_order_id = so.id
JOIN leads l ON so.lead_id = l.id
ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;

SELECT 'Backfilled invoices: ' || COUNT(*) FROM uv_ledger_entries WHERE entry_type = 'invoice';

-- NOTE: We do NOT backfill invoice_reversals
-- The reverse_invoice function creates Credit Notes which handle the accounting
-- Credit Notes with reason "Invoice Reversal: ..." are backfilled below

-- 2. Backfill PAYMENTS (was section 3)
INSERT INTO uv_ledger_entries (
    transaction_date,
    entry_type,
    document_number,
    description,
    debit,
    credit,
    lead_id,
    customer_name,
    customer_number,
    customer_phone,
    source_table,
    source_id,
    pdf_url,
    created_by,
    posted_at
)
SELECT 
    p.payment_date,
    'payment',
    p.payment_number,
    'Payment (' || p.payment_method || ')',
    0,
    p.amount,
    p.lead_id,
    COALESCE(l.full_name, 'Unknown'),
    l.customer_number,
    l.phone_number,
    'uv_payments',
    p.id,
    p.pdf_url,
    p.created_by,
    p.created_at
FROM uv_payments p
JOIN leads l ON p.lead_id = l.id
WHERE p.status = 'received'
ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;

SELECT 'Backfilled payments: ' || COUNT(*) FROM uv_ledger_entries WHERE entry_type = 'payment';

-- 3. Backfill CREDIT NOTES (includes reversal credit notes)
INSERT INTO uv_ledger_entries (
    transaction_date,
    entry_type,
    document_number,
    description,
    debit,
    credit,
    lead_id,
    customer_name,
    customer_number,
    customer_phone,
    source_table,
    source_id,
    pdf_url,
    created_by,
    posted_at
)
SELECT 
    adj.created_at::date,
    'credit_note',
    adj.adjustment_number,
    'Credit Note: ' || adj.reason,
    0,
    adj.amount,
    adj.lead_id,
    COALESCE(l.full_name, 'Unknown'),
    l.customer_number,
    l.phone_number,
    'uv_adjustments',
    adj.id,
    adj.pdf_url,
    adj.created_by,
    adj.created_at
FROM uv_adjustments adj
JOIN leads l ON adj.lead_id = l.id
WHERE adj.adjustment_type = 'credit_note'
ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;

SELECT 'Backfilled credit notes: ' || COUNT(*) FROM uv_ledger_entries WHERE entry_type = 'credit_note';

-- 4. Backfill REFUNDS
INSERT INTO uv_ledger_entries (
    transaction_date,
    entry_type,
    document_number,
    description,
    debit,
    credit,
    lead_id,
    customer_name,
    customer_number,
    customer_phone,
    source_table,
    source_id,
    pdf_url,
    created_by,
    posted_at
)
SELECT 
    adj.created_at::date,
    'refund',
    adj.adjustment_number,
    'Refund (' || COALESCE(adj.refund_method, 'N/A') || '): ' || adj.reason,
    adj.amount,
    0,
    adj.lead_id,
    COALESCE(l.full_name, 'Unknown'),
    l.customer_number,
    l.phone_number,
    'uv_adjustments',
    adj.id,
    adj.pdf_url,
    adj.created_by,
    adj.created_at
FROM uv_adjustments adj
JOIN leads l ON adj.lead_id = l.id
WHERE adj.adjustment_type = 'refund'
ON CONFLICT (source_table, source_id, entry_type) DO NOTHING;

SELECT 'Backfilled refunds: ' || COUNT(*) FROM uv_ledger_entries WHERE entry_type = 'refund';

-- 5. Summary
SELECT 'BACKFILL COMPLETE' AS status;
SELECT entry_type, COUNT(*) as count 
FROM uv_ledger_entries 
GROUP BY entry_type 
ORDER BY entry_type;

SELECT 'Total ledger entries: ' || COUNT(*) FROM uv_ledger_entries;

