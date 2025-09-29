-- IFRS Payment Separation Migration
-- Separates payments from charges for proper IFRS compliance

-- Step 1: Create new payment tables (already done in main schema)

-- Step 2: Replace old payment function with IFRS-compliant version
DROP FUNCTION IF EXISTS ifrs_apply_credit(UUID, UUID, NUMERIC);

CREATE OR REPLACE FUNCTION ifrs_apply_payment(
    p_payment_id UUID,
    p_invoice_id UUID,
    p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_payment RECORD;
    v_invoice_total NUMERIC;
    v_already_applied NUMERIC;
    v_available_amount NUMERIC;
    v_invoice_balance NUMERIC;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount to apply must be positive';
    END IF;

    -- Fetch payment record
    SELECT * INTO v_payment
    FROM ifrs_payments
    WHERE id = p_payment_id
      AND status IN ('received', 'allocated')
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found or already refunded';
    END IF;

    -- Calculate available payment amount
    SELECT COALESCE(SUM(applied_amount), 0) INTO v_already_applied
    FROM ifrs_payment_applications
    WHERE payment_id = p_payment_id;

    v_available_amount := v_payment.total_amount - v_already_applied;

    IF p_amount > v_available_amount THEN
        RAISE EXCEPTION 'Amount exceeds available payment balance (%.2f > %.2f)', p_amount, v_available_amount;
    END IF;

    -- Get invoice total (positive charges only)
    SELECT COALESCE(SUM(total_amount), 0) INTO v_invoice_total
    FROM ifrs_lease_accounting
    WHERE invoice_id = p_invoice_id
      AND total_amount > 0
      AND deleted_at IS NULL;

    -- Get current invoice balance (after existing applications)
    SELECT COALESCE(v_invoice_total - COALESCE(SUM(applied_amount), 0), v_invoice_total) INTO v_invoice_balance
    FROM ifrs_payment_applications
    WHERE invoice_id = p_invoice_id;

    IF p_amount > v_invoice_balance THEN
        RAISE EXCEPTION 'Amount exceeds invoice balance (%.2f > %.2f)', p_amount, v_invoice_balance;
    END IF;

    -- Record the application
    INSERT INTO ifrs_payment_applications (
        payment_id,
        invoice_id,
        applied_amount,
        created_by
    ) VALUES (
        p_payment_id,
        p_invoice_id,
        p_amount,
        auth.uid()
    );

    -- Update payment status
    UPDATE ifrs_payments
    SET status = CASE 
                    WHEN (v_already_applied + p_amount) >= total_amount THEN 'allocated'
                    ELSE 'received'
                 END,
        updated_at = NOW(),
        updated_by = auth.uid()
    WHERE id = p_payment_id;

    -- Update invoice status if fully paid
    SELECT COALESCE(v_invoice_total - COALESCE(SUM(applied_amount), 0), v_invoice_total) INTO v_invoice_balance
    FROM ifrs_payment_applications
    WHERE invoice_id = p_invoice_id;

    IF v_invoice_balance <= 0.01 THEN
        UPDATE ifrs_lease_accounting
        SET status = 'paid',
            updated_at = NOW(),
            updated_by = auth.uid(),
            version = version + 1
        WHERE invoice_id = p_invoice_id
          AND total_amount > 0
          AND status != 'paid'
          AND deleted_at IS NULL;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get payment summary for a lease
CREATE OR REPLACE FUNCTION ifrs_get_payment_summary(p_lease_id UUID)
RETURNS TABLE (
    payment_id UUID,
    payment_method TEXT,
    reference_number TEXT,
    total_amount NUMERIC,
    applied_amount NUMERIC,
    remaining_amount NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.payment_method,
        p.reference_number,
        p.total_amount,
        COALESCE(SUM(pa.applied_amount), 0) as applied_amount,
        p.total_amount - COALESCE(SUM(pa.applied_amount), 0) as remaining_amount,
        p.status,
        p.created_at
    FROM ifrs_payments p
    LEFT JOIN ifrs_payment_applications pa ON p.id = pa.payment_id
    WHERE p.lease_id = p_lease_id
    GROUP BY p.id, p.payment_method, p.reference_number, p.total_amount, p.status, p.created_at
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get invoice balance after payments
CREATE OR REPLACE FUNCTION ifrs_get_invoice_balance(p_invoice_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_invoice_total NUMERIC;
    v_payments_applied NUMERIC;
BEGIN
    -- Get invoice total (positive charges + credit notes)
    SELECT COALESCE(SUM(total_amount), 0) INTO v_invoice_total
    FROM ifrs_lease_accounting
    WHERE invoice_id = p_invoice_id
      AND deleted_at IS NULL;

    -- Get payments applied to this invoice
    SELECT COALESCE(SUM(applied_amount), 0) INTO v_payments_applied
    FROM ifrs_payment_applications
    WHERE invoice_id = p_invoice_id;

    RETURN v_invoice_total - v_payments_applied;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
