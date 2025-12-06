-- =====================================================
-- UV SALES ACCOUNTING - STEP 7: STATEMENT OF ACCOUNT
-- =====================================================
-- Creates a view that combines all transactions
-- for generating customer statements
-- =====================================================

-- 1. Create the SOA view
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

    -- Refunds (we return money - DEBIT, reduces their credit/increases balance)
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

-- 2. Create a function to get SOA for a specific customer
CREATE OR REPLACE FUNCTION get_customer_soa(
    p_lead_id UUID,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    transaction_date TIMESTAMPTZ,
    transaction_type TEXT,
    reference TEXT,
    description TEXT,
    debit NUMERIC,
    credit NUMERIC,
    running_balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.transaction_date,
        s.transaction_type,
        s.reference,
        s.description,
        s.debit,
        s.credit,
        s.running_balance
    FROM uv_statement_of_account s
    WHERE s.lead_id = p_lead_id
    AND (p_from_date IS NULL OR s.transaction_date >= p_from_date)
    AND (p_to_date IS NULL OR s.transaction_date <= p_to_date)
    ORDER BY s.transaction_date, s.reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function to get customer balance summary
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

-- 4. Add comments
COMMENT ON VIEW uv_statement_of_account IS 'Combined view of all customer transactions for SOA generation';
COMMENT ON FUNCTION get_customer_soa IS 'Get statement of account for a specific customer with optional date range';
COMMENT ON FUNCTION get_customer_balance IS 'Get balance summary for a customer';

-- 5. Verify
SELECT 'SOA view and functions created successfully' AS status;

-- Test query (will be empty if no data)
SELECT 'Sample SOA query:' as info;
SELECT * FROM uv_statement_of_account LIMIT 5;

