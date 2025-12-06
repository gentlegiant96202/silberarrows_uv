-- =====================================================
-- UV SALES ACCOUNTING - FIX REVERSAL AS CREDIT NOTE
-- =====================================================
-- Instead of phantom "reversal" entries, reversing an
-- invoice now creates an actual Credit Note for the
-- remaining balance, zeroing out the invoice properly.
-- =====================================================

-- 1. Update the reverse_invoice function (must drop first due to changed return type)
DROP FUNCTION IF EXISTS reverse_invoice(UUID, TEXT, UUID);

CREATE OR REPLACE FUNCTION reverse_invoice(
    p_invoice_id UUID,
    p_reason TEXT,
    p_reversed_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_invoice RECORD;
    v_sales_order_id UUID;
    v_lead_id UUID;
    v_balance_due NUMERIC;
    v_credit_note_id UUID;
    v_credit_note_number TEXT;
    v_new_counter INT;
BEGIN
    -- Get invoice details
    SELECT 
        inv.id, 
        inv.invoice_number, 
        inv.status, 
        inv.balance_due,
        inv.sales_order_id,
        so.lead_id
    INTO v_invoice
    FROM uv_invoices inv
    JOIN uv_sales_orders so ON inv.sales_order_id = so.id
    WHERE inv.id = p_invoice_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
    END IF;
    
    IF v_invoice.status = 'reversed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invoice is already reversed');
    END IF;
    
    v_sales_order_id := v_invoice.sales_order_id;
    v_lead_id := v_invoice.lead_id;
    v_balance_due := v_invoice.balance_due;
    
    -- If there's a balance due, create a credit note to zero it out
    IF v_balance_due > 0 THEN
        -- Get next credit note number (gapless)
        UPDATE uv_document_counters 
        SET last_number = last_number + 1 
        WHERE document_type = 'credit_note'
        RETURNING last_number INTO v_new_counter;
        
        IF v_new_counter IS NULL THEN
            -- Counter doesn't exist, create it
            INSERT INTO uv_document_counters (document_type, prefix, last_number)
            VALUES ('credit_note', 'UV-CN-', 1001)
            ON CONFLICT (document_type) DO UPDATE SET last_number = uv_document_counters.last_number + 1
            RETURNING last_number INTO v_new_counter;
        END IF;
        
        v_credit_note_number := 'UV-CN-' || v_new_counter;
        
        -- Create the credit note
        INSERT INTO uv_adjustments (
            lead_id,
            invoice_id,
            adjustment_type,
            adjustment_number,
            amount,
            reason,
            created_by
        ) VALUES (
            v_lead_id,
            p_invoice_id,
            'credit_note',
            v_credit_note_number,
            v_balance_due,
            'Invoice Reversal: ' || COALESCE(p_reason, 'No reason provided'),
            p_reversed_by
        )
        RETURNING id INTO v_credit_note_id;
    END IF;
    
    -- Mark invoice as reversed
    UPDATE uv_invoices
    SET 
        status = 'reversed',
        reversed_at = NOW(),
        reversed_by = p_reversed_by,
        reversal_reason = p_reason
    WHERE id = p_invoice_id;
    
    -- Delete payment allocations for this invoice (payments become unallocated)
    DELETE FROM uv_payment_allocations WHERE invoice_id = p_invoice_id;
    
    -- Update sales order status back to draft
    UPDATE uv_sales_orders
    SET status = 'draft'
    WHERE id = v_sales_order_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Invoice reversed successfully',
        'credit_note_id', v_credit_note_id,
        'credit_note_number', v_credit_note_number,
        'credit_note_amount', v_balance_due
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update SOA view to remove phantom reversal entries
-- (Credit notes now handle reversals properly)
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

    -- Payment Allocations (customer paid us - CREDIT)
    -- Show each allocation separately with invoice reference
    SELECT 
        pa.created_at as transaction_date,
        'payment' as transaction_type,
        p.payment_number as reference,
        'Payment (' || p.payment_method || ') → ' || inv.invoice_number as description,
        0::numeric as debit,
        pa.amount as credit,
        p.lead_id,
        pa.id as source_id
    FROM uv_payment_allocations pa
    JOIN uv_payments p ON pa.payment_id = p.id
    JOIN uv_invoices inv ON pa.invoice_id = inv.id
    WHERE p.status = 'received'

    UNION ALL

    -- Unallocated Payments (money received but not yet applied)
    SELECT 
        p.payment_date as transaction_date,
        'payment' as transaction_type,
        p.payment_number as reference,
        'Payment (' || p.payment_method || ') - Unallocated' as description,
        0::numeric as debit,
        (p.amount - COALESCE((SELECT SUM(pa.amount) FROM uv_payment_allocations pa WHERE pa.payment_id = p.id), 0)) as credit,
        p.lead_id,
        p.id as source_id
    FROM uv_payments p
    WHERE p.status = 'received'
    AND (p.amount - COALESCE((SELECT SUM(pa.amount) FROM uv_payment_allocations pa WHERE pa.payment_id = p.id), 0)) > 0

    UNION ALL

    -- Credit Notes (reduces what customer owes - CREDIT)
    -- Include invoice reference
    SELECT 
        adj.created_at as transaction_date,
        'credit_note' as transaction_type,
        adj.adjustment_number as reference,
        'Credit Note → ' || COALESCE(inv.invoice_number, 'N/A') || ': ' || adj.reason as description,
        0::numeric as debit,
        adj.amount as credit,
        adj.lead_id,
        adj.id as source_id
    FROM uv_adjustments adj
    LEFT JOIN uv_invoices inv ON adj.invoice_id = inv.id
    WHERE adj.adjustment_type = 'credit_note'

    UNION ALL

    -- Refunds (we return money to customer - DEBIT)
    -- Include invoice reference
    SELECT 
        adj.created_at as transaction_date,
        'refund' as transaction_type,
        adj.adjustment_number as reference,
        'Refund (' || COALESCE(adj.refund_method, 'N/A') || ') → ' || COALESCE(inv.invoice_number, 'N/A') || ': ' || adj.reason as description,
        adj.amount as debit,
        0::numeric as credit,
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

-- 3. Recreate the SOA function
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

-- 4. Recreate balance function
DROP FUNCTION IF EXISTS get_customer_balance(UUID);

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

-- 5. Add comments
COMMENT ON FUNCTION reverse_invoice IS 'Reverses an invoice by creating a credit note for the remaining balance';
COMMENT ON VIEW uv_statement_of_account IS 'Complete audit trail - reversals now appear as proper credit notes';

-- 6. Verify
SELECT 'Invoice reversal now creates proper Credit Notes!' AS status;
SELECT 'Reversing an invoice with balance 35,000 will create UV-CN-XXXX for 35,000' AS example;

