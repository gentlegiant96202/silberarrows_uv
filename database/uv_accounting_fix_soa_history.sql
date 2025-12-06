-- =====================================================
-- UV SALES ACCOUNTING - FIX SOA HISTORY
-- =====================================================
-- The SOA was incorrectly hiding reversed invoices
-- Instead of maintaining full audit history
-- =====================================================

-- 1. Drop and recreate the SOA view with proper history
DROP VIEW IF EXISTS uv_statement_of_account CASCADE;

CREATE OR REPLACE VIEW uv_statement_of_account AS
WITH all_transactions AS (
    -- ALL Invoices (customer owes us - DEBIT)
    -- Show ALL invoices regardless of status for audit trail
    SELECT 
        inv.created_at as transaction_date,
        'invoice' as transaction_type,
        inv.invoice_number as reference,
        CASE 
            WHEN inv.status = 'reversed' THEN 'Invoice (Reversed)'
            ELSE 'Invoice'
        END as description,
        inv.total_amount as debit,
        0::numeric as credit,
        so.lead_id,
        inv.id as source_id
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id
    -- NO status filter - show ALL invoices

    UNION ALL

    -- Invoice Reversals (show as separate credit entry to zero out)
    SELECT 
        inv.reversed_at as transaction_date,
        'invoice_reversal' as transaction_type,
        inv.invoice_number as reference,
        'Invoice Reversal: ' || COALESCE(inv.reversal_reason, 'No reason provided') as description,
        0::numeric as debit,
        inv.total_amount as credit,
        so.lead_id,
        inv.id as source_id
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id
    WHERE inv.status = 'reversed' AND inv.reversed_at IS NOT NULL

    UNION ALL

    -- Payment Allocations (customer paid us - CREDIT)
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

    -- Refunds (we return money to customer - reduces paid amount, shows as DEBIT)
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

-- 2. Recreate the function (dropped with CASCADE)
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

-- 3. Recreate balance function (must drop first due to changed return type)
DROP FUNCTION IF EXISTS get_customer_balance(UUID);

CREATE OR REPLACE FUNCTION get_customer_balance(p_lead_id UUID)
RETURNS TABLE (
    total_invoiced NUMERIC,
    total_paid NUMERIC,
    total_credit_notes NUMERIC,
    total_refunds NUMERIC,
    total_reversals NUMERIC,
    current_balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'invoice' THEN debit ELSE 0 END), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN credit ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit_note' THEN credit ELSE 0 END), 0) as total_credit_notes,
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN debit ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(CASE WHEN transaction_type = 'invoice_reversal' THEN credit ELSE 0 END), 0) as total_reversals,
        COALESCE(SUM(debit - credit), 0) as current_balance
    FROM uv_statement_of_account
    WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add comments
COMMENT ON VIEW uv_statement_of_account IS 'Complete audit trail of all customer transactions for SOA - includes reversed invoices';
COMMENT ON FUNCTION get_customer_soa IS 'Get statement of account for a specific customer with optional date range';
COMMENT ON FUNCTION get_customer_balance IS 'Get balance summary for a customer including reversals';

-- 5. Verify
SELECT 'SOA view fixed - now shows complete history including reversed invoices' AS status;

-- Show sample data
SELECT 'Sample SOA with full history:' as info;
SELECT * FROM uv_statement_of_account LIMIT 10;

