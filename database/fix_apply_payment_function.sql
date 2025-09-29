-- Fix ifrs_apply_payment function to work with new payment system
-- This replaces the old function that looked for refund records in ifrs_lease_accounting

DROP FUNCTION IF EXISTS ifrs_apply_payment(UUID, UUID, NUMERIC);

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
        -- Mark all invoice charges as paid
        UPDATE ifrs_lease_accounting
        SET status = 'paid',
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE invoice_id = p_invoice_id
          AND status = 'invoiced'
          AND deleted_at IS NULL;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function exists
SELECT 'ifrs_apply_payment function updated successfully' as status;
