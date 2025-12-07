-- =====================================================
-- UV SALES ACCOUNTING - FIX REFUND AS CREDIT
-- =====================================================
-- ISSUE: Refunds were showing as DEBITS (increasing balance)
-- FIX: Refunds should be CREDITS (reducing balance)
-- 
-- Correct Logic:
--   Invoice    → Debit  (customer owes us)
--   Payment    → Credit (customer paid)
--   Credit Note → Credit (reduces what they owe)
--   Refund     → Credit (we return money to them)
-- =====================================================

-- Drop and recreate the SOA view with corrected refund logic
DROP VIEW IF EXISTS uv_statement_of_account CASCADE;

CREATE OR REPLACE VIEW uv_statement_of_account AS
WITH all_transactions AS (
    -- ALL Invoices (customer owes us - DEBIT)
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

    UNION ALL

    -- Payments (customer paid us - CREDIT)
    SELECT 
        p.created_at as transaction_date,
        'payment' as transaction_type,
        p.payment_number as reference,
        'Payment (' || p.payment_method || ')' || 
            CASE WHEN p.reference IS NOT NULL AND p.reference != '' 
                THEN ' - ' || p.reference 
                ELSE '' 
            END as description,
        0::numeric as debit,
        p.amount as credit,
        p.lead_id,
        p.id as source_id
    FROM uv_payments p
    WHERE p.status = 'received'

    UNION ALL

    -- Credit Notes (reduces what customer owes - CREDIT)
    SELECT 
        adj.created_at as transaction_date,
        'credit_note' as transaction_type,
        adj.adjustment_number as reference,
        'Credit Note → ' || COALESCE(inv.invoice_number, 'N/A') || ': ' || 
            CASE 
                WHEN adj.reason LIKE 'Invoice Reversal:%' THEN 'Full Reversal'
                ELSE adj.reason 
            END as description,
        0::numeric as debit,
        adj.amount as credit,
        adj.lead_id,
        adj.id as source_id
    FROM uv_adjustments adj
    LEFT JOIN uv_invoices inv ON adj.invoice_id = inv.id
    WHERE adj.adjustment_type = 'credit_note'

    UNION ALL

    -- Refunds (we return money to customer - CREDIT) ✅ FIXED!
    -- Previously was DEBIT which caused confusing balance jumps
    SELECT 
        adj.created_at as transaction_date,
        'refund' as transaction_type,
        adj.adjustment_number as reference,
        'Refund (' || COALESCE(adj.refund_method, 'N/A') || ') → ' || 
            COALESCE(inv.invoice_number, 'N/A') || ': ' || adj.reason as description,
        0::numeric as debit,      -- ✅ Changed from adj.amount
        adj.amount as credit,      -- ✅ Changed from 0
        adj.lead_id,
        adj.id as source_id
    FROM uv_adjustments adj
    LEFT JOIN uv_invoices inv ON adj.invoice_id = inv.id
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
    -- Positive = Customer owes us
    -- Negative = We owe customer (shown as CR)
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
    ) as running_balance
FROM all_transactions
ORDER BY lead_id, transaction_date, reference;

-- Recreate the SOA function
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
        soa.transaction_date,
        soa.transaction_type,
        soa.reference,
        soa.description,
        soa.debit,
        soa.credit,
        soa.running_balance
    FROM uv_statement_of_account soa
    WHERE soa.lead_id = p_lead_id
      AND (p_from_date IS NULL OR soa.transaction_date::date >= p_from_date)
      AND (p_to_date IS NULL OR soa.transaction_date::date <= p_to_date)
    ORDER BY soa.transaction_date, soa.reference;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the SOA balance function to reflect correct totals
CREATE OR REPLACE FUNCTION get_customer_soa_balance(p_lead_id UUID)
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
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN credit ELSE 0 END), 0) as total_refunds,
        -- Balance = Invoices - Payments - Credit Notes - Refunds
        -- Positive = Customer owes us, Negative = We owe customer
        COALESCE(SUM(debit - credit), 0) as current_balance
    FROM uv_statement_of_account
    WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON uv_statement_of_account TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_soa TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_soa_balance TO authenticated;

-- Also update the ledger summary function to use credit for refunds
CREATE OR REPLACE FUNCTION get_ledger_summary(
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_invoiced NUMERIC,
    total_paid NUMERIC,
    total_credit_notes NUMERIC,
    total_refunds NUMERIC,
    net_receivables NUMERIC,
    transaction_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'invoice' THEN debit ELSE 0 END), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN credit ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN transaction_type = 'credit_note' THEN credit ELSE 0 END), 0) as total_credit_notes,
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN credit ELSE 0 END), 0) as total_refunds,  -- ✅ Changed from debit to credit
        COALESCE(SUM(debit - credit), 0) as net_receivables,
        COUNT(*) as transaction_count
    FROM uv_accounts_ledger
    WHERE (p_from_date IS NULL OR transaction_date >= p_from_date)
    AND (p_to_date IS NULL OR transaction_date <= p_to_date + INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ledger_summary TO authenticated;

-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================
-- After running this migration, the SOA should show:
--
-- Transaction Type | Debit/Credit
-- -----------------|-------------
-- Invoice          | Debit (increases balance)
-- Payment          | Credit (decreases balance)
-- Credit Note      | Credit (decreases balance)
-- Refund           | Credit (decreases balance) ✅ FIXED!
--
-- Example clean SOA:
-- Invoice:      +220,000   Balance: 220,000
-- Payment:       -5,000    Balance: 215,000
-- Credit Note:   -2,000    Balance: 213,000
-- Refund:        -2,000    Balance: 211,000 ← No more bouncing!
-- =====================================================

