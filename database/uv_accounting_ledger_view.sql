-- =====================================================
-- UV SALES ACCOUNTING - FULL LEDGER VIEW
-- =====================================================
-- A comprehensive ledger showing ALL transactions
-- across ALL customers for the accounts team
-- =====================================================

-- 1. Create the full ledger view with customer details
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
    -- Customer details from leads
    l.full_name as customer_name,
    l.phone_number as customer_phone,
    l.customer_number,
    -- Running balance per customer
    SUM(soa.debit - soa.credit) OVER (
        PARTITION BY soa.lead_id 
        ORDER BY soa.transaction_date, soa.reference
        ROWS UNBOUNDED PRECEDING
    ) as customer_balance,
    -- Overall running balance (all customers combined)
    SUM(soa.debit - soa.credit) OVER (
        ORDER BY soa.transaction_date, soa.lead_id, soa.reference
        ROWS UNBOUNDED PRECEDING
    ) as total_balance
FROM uv_statement_of_account soa
JOIN leads l ON soa.lead_id = l.id
ORDER BY soa.transaction_date DESC, soa.reference;

-- 2. Create function to get ledger with filters
CREATE OR REPLACE FUNCTION get_accounts_ledger(
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL,
    p_transaction_type TEXT DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 100,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    transaction_date TIMESTAMPTZ,
    transaction_type TEXT,
    reference TEXT,
    description TEXT,
    debit NUMERIC,
    credit NUMERIC,
    lead_id UUID,
    source_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    customer_number TEXT,
    customer_balance NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.transaction_date,
        al.transaction_type,
        al.reference,
        al.description,
        al.debit,
        al.credit,
        al.lead_id,
        al.source_id,
        al.customer_name,
        al.customer_phone,
        al.customer_number,
        al.customer_balance
    FROM uv_accounts_ledger al
    WHERE (p_from_date IS NULL OR al.transaction_date >= p_from_date)
    AND (p_to_date IS NULL OR al.transaction_date <= p_to_date + INTERVAL '1 day')
    AND (p_transaction_type IS NULL OR al.transaction_type = p_transaction_type)
    AND (p_customer_id IS NULL OR al.lead_id = p_customer_id)
    ORDER BY al.transaction_date DESC, al.reference
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to get ledger summary
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

-- 4. Grant access
GRANT SELECT ON uv_accounts_ledger TO authenticated;

-- 5. Comments
COMMENT ON VIEW uv_accounts_ledger IS 'Full ledger view showing all transactions across all customers with running balances';
COMMENT ON FUNCTION get_accounts_ledger IS 'Get paginated ledger entries with optional filters';
COMMENT ON FUNCTION get_ledger_summary IS 'Get summary totals for the ledger';

-- 6. Verify
SELECT 'Accounts Ledger view created successfully!' AS status;
SELECT COUNT(*) as total_transactions FROM uv_accounts_ledger;


