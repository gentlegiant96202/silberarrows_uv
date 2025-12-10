-- =====================================================
-- UV SALES ACCOUNTING - SOA UPDATE: Include Payment in Refunds
-- =====================================================
-- Updates the SOA view to show which payment was refunded
-- =====================================================

-- Drop and recreate the SOA view with refund payment info
CREATE OR REPLACE VIEW uv_statement_of_account AS
WITH all_transactions AS (
    -- Invoices (customer owes us - DEBIT)
    SELECT 
        inv.created_at as transaction_date,
        'invoice' as transaction_type,
        inv.invoice_number as reference,
        'Invoice' as description,
        inv.total_amount as debit,
        0::numeric as credit,
        so.lead_id,
        inv.id as source_id
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id
    WHERE inv.status != 'reversed'

    UNION ALL

    -- Reversed Invoices (show as reversal - CREDIT)
    SELECT 
        inv.reversed_at as transaction_date,
        'invoice_reversal' as transaction_type,
        inv.invoice_number as reference,
        'Invoice Reversed: ' || COALESCE(inv.reversal_reason, 'No reason') as description,
        0::numeric as debit,
        inv.total_amount as credit,
        so.lead_id,
        inv.id as source_id
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id
    WHERE inv.status = 'reversed' AND inv.reversed_at IS NOT NULL

    UNION ALL

    -- Payments (customer paid us - CREDIT)
    SELECT 
        pa.created_at as transaction_date,
        'payment' as transaction_type,
        p.payment_number as reference,
        'Payment (' || p.payment_method || ')' as description,
        0::numeric as debit,
        pa.amount as credit,
        p.lead_id,
        pa.id as source_id
    FROM uv_payment_allocations pa
    JOIN uv_payments p ON pa.payment_id = p.id
    WHERE p.status = 'received'

    UNION ALL

    -- Credit Notes (reduces what customer owes - CREDIT)
    SELECT 
        adj.created_at as transaction_date,
        'credit_note' as transaction_type,
        adj.adjustment_number as reference,
        'Credit Note: ' || adj.reason as description,
        0::numeric as debit,
        adj.amount as credit,
        adj.lead_id,
        adj.id as source_id
    FROM uv_adjustments adj
    WHERE adj.adjustment_type = 'credit_note'

    UNION ALL

    -- Refunds (we return money - DEBIT) - NOW INCLUDES PAYMENT NUMBER
    SELECT 
        adj.created_at as transaction_date,
        'refund' as transaction_type,
        adj.adjustment_number as reference,
        'Refund of ' || COALESCE(p.payment_number, 'N/A') || ' (' || COALESCE(adj.refund_method, 'N/A') || '): ' || adj.reason as description,
        ra.amount as debit,  -- Use allocation amount (allows partial refunds)
        0::numeric as credit,
        adj.lead_id,
        ra.id as source_id  -- Use allocation id for uniqueness
    FROM uv_adjustments adj
    JOIN uv_refund_allocations ra ON ra.refund_id = adj.id
    JOIN uv_payments p ON ra.payment_id = p.id
    WHERE adj.adjustment_type = 'refund'

    UNION ALL

    -- Legacy Refunds (not linked to payments - for backward compatibility)
    SELECT 
        adj.created_at as transaction_date,
        'refund' as transaction_type,
        adj.adjustment_number as reference,
        'Refund (' || COALESCE(adj.refund_method, 'N/A') || '): ' || adj.reason as description,
        adj.amount as debit,
        0::numeric as credit,
        adj.lead_id,
        adj.id as source_id
    FROM uv_adjustments adj
    WHERE adj.adjustment_type = 'refund'
    AND NOT EXISTS (
        SELECT 1 FROM uv_refund_allocations ra WHERE ra.refund_id = adj.id
    )
)
SELECT 
    transaction_date,
    transaction_type,
    reference,
    description,
    debit,
    credit,
    lead_id,
    source_id,
    -- Running balance (cumulative debit - credit)
    SUM(debit - credit) OVER (
        PARTITION BY lead_id 
        ORDER BY transaction_date, 
                 CASE transaction_type 
                     WHEN 'invoice' THEN 1 
                     WHEN 'payment' THEN 2 
                     WHEN 'credit_note' THEN 3 
                     WHEN 'refund' THEN 4
                     WHEN 'invoice_reversal' THEN 5
                     ELSE 6 
                 END,
                 reference
        ROWS UNBOUNDED PRECEDING
    ) as running_balance
FROM all_transactions
ORDER BY lead_id, transaction_date, reference;

-- Add comment
COMMENT ON VIEW uv_statement_of_account IS 'Combined view of all customer transactions for SOA generation - includes refund payment linkage';

-- Verify
SELECT 'SOA view updated to include payment number in refunds' AS status;

