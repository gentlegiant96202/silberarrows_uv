-- =====================================================
-- UV SALES ACCOUNTING - SOA VIEW (CORRECT VERSION)
-- =====================================================
-- Shows ALL invoices, ALL payments, credit notes, and refunds
-- Refunds show linked payment number
-- No duplicate invoice_reversal section (credit notes handle reversals)
-- =====================================================

CREATE OR REPLACE VIEW uv_statement_of_account AS
WITH all_transactions AS (
    -- ALL Invoices (including reversed - credit notes handle the reversal credit)
    SELECT 
        inv.created_at AS transaction_date,
        'invoice'::text AS transaction_type,
        inv.invoice_number AS reference,
        'Invoice'::text AS description,
        inv.total_amount AS debit,
        0::numeric AS credit,
        so.lead_id,
        inv.id AS source_id
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id

    UNION ALL

    -- ALL Payments (allocated or not)
    SELECT 
        p.created_at AS transaction_date,
        'payment'::text AS transaction_type,
        p.payment_number AS reference,
        'Payment (' || p.payment_method || ')' AS description,
        0::numeric AS debit,
        p.amount AS credit,
        p.lead_id,
        p.id AS source_id
    FROM uv_payments p
    WHERE p.status = 'received'

    UNION ALL

    -- Credit Notes
    SELECT 
        adj.created_at AS transaction_date,
        'credit_note'::text AS transaction_type,
        adj.adjustment_number AS reference,
        'Credit Note: ' || adj.reason AS description,
        0::numeric AS debit,
        adj.amount AS credit,
        adj.lead_id,
        adj.id AS source_id
    FROM uv_adjustments adj
    WHERE adj.adjustment_type = 'credit_note'

    UNION ALL

    -- Refunds WITH linked payment (new refunds via uv_refund_allocations)
    SELECT 
        adj.created_at AS transaction_date,
        'refund'::text AS transaction_type,
        adj.adjustment_number AS reference,
        'Refund of ' || p.payment_number || ' (' || COALESCE(adj.refund_method, 'N/A') || '): ' || adj.reason AS description,
        ra.amount AS debit,
        0::numeric AS credit,
        adj.lead_id,
        ra.id AS source_id
    FROM uv_adjustments adj
    JOIN uv_refund_allocations ra ON ra.refund_id = adj.id
    JOIN uv_payments p ON ra.payment_id = p.id
    WHERE adj.adjustment_type = 'refund'

    UNION ALL

    -- Refunds WITHOUT linked payment (legacy refunds before refund allocations)
    SELECT 
        adj.created_at AS transaction_date,
        'refund'::text AS transaction_type,
        adj.adjustment_number AS reference,
        'Refund (' || COALESCE(adj.refund_method, 'N/A') || '): ' || adj.reason AS description,
        adj.amount AS debit,
        0::numeric AS credit,
        adj.lead_id,
        adj.id AS source_id
    FROM uv_adjustments adj
    WHERE adj.adjustment_type = 'refund'
    AND NOT EXISTS (SELECT 1 FROM uv_refund_allocations ra WHERE ra.refund_id = adj.id)
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
    SUM(debit - credit) OVER (
        PARTITION BY lead_id 
        ORDER BY transaction_date, 
            CASE transaction_type 
                WHEN 'invoice' THEN 1 
                WHEN 'payment' THEN 2 
                WHEN 'credit_note' THEN 3 
                WHEN 'refund' THEN 4
                ELSE 5 
            END,
            reference
        ROWS UNBOUNDED PRECEDING
    ) AS running_balance
FROM all_transactions
ORDER BY lead_id, transaction_date, reference;

-- Update the get_customer_balance function to match
CREATE OR REPLACE FUNCTION get_customer_balance(p_lead_id UUID)
RETURNS TABLE (
    total_invoiced NUMERIC,
    total_paid NUMERIC,
    total_credit_notes NUMERIC,
    total_refunds NUMERIC,
    current_balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'invoice' THEN debit ELSE 0 END), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN credit ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit_note' THEN credit ELSE 0 END), 0) as total_credit_notes,
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN debit ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(debit - credit), 0) as current_balance
    FROM uv_statement_of_account
    WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT 'SOA view updated with correct logic' AS status;
