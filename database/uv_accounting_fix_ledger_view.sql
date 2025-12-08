-- =====================================================
-- FIX: RECREATE ACCOUNTS LEDGER VIEW
-- =====================================================
-- The ledger view was dropped when SOA was recreated
-- Run this to restore the accounts ledger
-- =====================================================

-- 1. Recreate the accounts ledger view
CREATE OR REPLACE VIEW uv_accounts_ledger AS
SELECT 
    soa.transaction_date,
    soa.transaction_type,
    soa.reference,
    soa.description,
    soa.debit,
    soa.credit,
    soa.lead_id,
    soa.source_id,
    l.full_name as customer_name,
    l.phone_number as customer_phone,
    l.customer_number,
    SUM(soa.debit - soa.credit) OVER (
        PARTITION BY soa.lead_id 
        ORDER BY soa.transaction_date, soa.reference
        ROWS UNBOUNDED PRECEDING
    ) as customer_balance,
    SUM(soa.debit - soa.credit) OVER (
        ORDER BY soa.transaction_date, soa.lead_id, soa.reference
        ROWS UNBOUNDED PRECEDING
    ) as total_balance
FROM uv_statement_of_account soa
JOIN leads l ON soa.lead_id = l.id
ORDER BY soa.transaction_date DESC, soa.reference;

-- 2. Grant access
GRANT SELECT ON uv_accounts_ledger TO authenticated;

-- 3. Recreate summary function
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
        COALESCE(SUM(CASE WHEN transaction_type = 'refund' THEN debit ELSE 0 END), 0) as total_refunds,
        COALESCE(SUM(debit - credit), 0) as net_receivables,
        COUNT(*) as transaction_count
    FROM uv_accounts_ledger
    WHERE (p_from_date IS NULL OR transaction_date >= p_from_date)
    AND (p_to_date IS NULL OR transaction_date <= p_to_date + INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_ledger_summary TO authenticated;

-- 4. Verify
SELECT 'Ledger view restored!' AS status;
SELECT COUNT(*) as total_transactions FROM uv_accounts_ledger;






