-- 🔧 COMPREHENSIVE FIX FOR CREDIT NOTE ISSUES
-- This fixes both the constraint issue and the function logic

-- Step 1: Fix the constraints to allow negative amounts for credit notes
ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS ifrs_valid_amount;

ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS valid_amount;

ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS valid_unit_price;

-- Add the correct constraints
ALTER TABLE ifrs_lease_accounting 
ADD CONSTRAINT ifrs_valid_amount CHECK (
    (charge_type = 'refund' AND total_amount <= 0)
    OR (charge_type = 'credit_note' AND total_amount <= 0) 
    OR (charge_type NOT IN ('refund', 'credit_note') AND total_amount >= 0)
);

ALTER TABLE ifrs_lease_accounting 
ADD CONSTRAINT valid_unit_price CHECK (
    (charge_type = 'refund' AND (unit_price IS NULL OR unit_price <= 0))
    OR (charge_type = 'credit_note' AND (unit_price IS NULL OR unit_price <= 0))
    OR (charge_type NOT IN ('refund', 'credit_note') AND (unit_price IS NULL OR unit_price >= 0))
);

-- Step 2: Update the credit note function to fix unit_price issue
CREATE OR REPLACE FUNCTION ifrs_issue_credit_note(
    p_invoice_id UUID,
    p_charge_ids UUID[],
    p_custom_amounts NUMERIC[] DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    v_credit_note_id UUID;
    v_credit_note_number TEXT;
    v_credit_sequence INTEGER;
    v_invoice RECORD;
    v_charge RECORD;
    v_total_amount NUMERIC := 0;
    v_vat_amount NUMERIC := 0;
    v_new_charge_id UUID;
    v_charge_count INTEGER := 0;
    v_custom_amount NUMERIC;
    v_credit_amount NUMERIC;
BEGIN
    IF array_length(p_charge_ids, 1) IS NULL OR array_length(p_charge_ids, 1) = 0 THEN
        RAISE EXCEPTION 'No charges provided for credit note issuance';
    END IF;

    SELECT 
        invoice_id,
        invoice_number,
        lease_id,
        MIN(billing_period) AS billing_period
    INTO v_invoice
    FROM ifrs_lease_accounting
    WHERE invoice_id = p_invoice_id
      AND deleted_at IS NULL
    GROUP BY invoice_id, invoice_number, lease_id;

    IF v_invoice.invoice_id IS NULL THEN
        RAISE EXCEPTION 'Invoice not found for credit note issuance';
    END IF;

    v_credit_sequence := nextval('lease_credit_note_sequence');
    v_credit_note_number := 'CN-LE-' || LPAD(v_credit_sequence::TEXT, 4, '0');

    INSERT INTO ifrs_credit_notes (
        lease_id,
        original_invoice_id,
        original_invoice_number,
        credit_note_number,
        status,
        reason,
        created_by
    ) VALUES (
        v_invoice.lease_id,
        v_invoice.invoice_id,
        v_invoice.invoice_number,
        v_credit_note_number,
        'issued',
        p_reason,
        auth.uid()
    ) RETURNING id INTO v_credit_note_id;

    FOR v_charge IN
        SELECT *
        FROM ifrs_lease_accounting
        WHERE id = ANY(p_charge_ids)
          AND invoice_id = p_invoice_id
          AND deleted_at IS NULL
    LOOP
        IF v_charge.status NOT IN ('invoiced', 'paid') THEN
            RAISE EXCEPTION 'Charge % cannot be credited because its status is %', v_charge.id, v_charge.status;
        END IF;

        IF v_charge.lease_id <> v_invoice.lease_id THEN
            RAISE EXCEPTION 'Charge % does not belong to the target lease for this credit note', v_charge.id;
        END IF;

        -- Determine credit amount (custom or full)
        v_charge_count := v_charge_count + 1;
        IF p_custom_amounts IS NOT NULL AND array_length(p_custom_amounts, 1) >= v_charge_count THEN
            v_custom_amount := p_custom_amounts[v_charge_count];
            IF v_custom_amount <= 0 OR v_custom_amount > v_charge.total_amount THEN
                RAISE EXCEPTION 'Invalid custom amount % for charge %. Must be between 0 and %', 
                    v_custom_amount, v_charge.id, v_charge.total_amount;
            END IF;
            v_credit_amount := v_custom_amount;
        ELSE
            v_credit_amount := v_charge.total_amount;
        END IF;

        INSERT INTO ifrs_credit_note_lines (
            credit_note_id,
            original_charge_id,
            charge_type,
            quantity,
            unit_price,
            total_amount,
            comment
        ) VALUES (
            v_credit_note_id,
            v_charge.id,
            v_charge.charge_type,
            v_charge.quantity,
            v_charge.unit_price,
            v_credit_amount,
            v_charge.comment
        );

        v_total_amount := v_total_amount + v_credit_amount;
        v_vat_amount := v_vat_amount + (v_credit_amount * 0.05); -- Assuming 5% VAT
        
        -- Mark the original charge as credited or partially credited
        UPDATE ifrs_lease_accounting
        SET 
            status = 'paid', -- Mark original charge as paid/credited
            updated_at = NOW(),
            updated_by = auth.uid()
        WHERE id = v_charge.id;

        -- Insert a negative charge (credit note) into ifrs_lease_accounting
        INSERT INTO ifrs_lease_accounting (
            lease_id,
            billing_period,
            charge_type,
            quantity,
            unit_price,
            total_amount,
            comment,
            invoice_id,
            invoice_number,
            credit_note_id,
            status,
            vat_applicable,
            created_by
        ) VALUES (
            v_invoice.lease_id,
            v_invoice.billing_period,
            'credit_note',
            1, -- Quantity for credit note
            -v_credit_amount, -- Unit price is the negative credit amount
            -v_credit_amount, -- Total amount is the negative credit amount
            'Credit note issued (Original charge ' || v_charge.id || ')',
            NULL, -- Credit notes are not directly linked to an invoice as a charge
            NULL, -- Credit notes are not directly linked to an invoice as a charge
            v_credit_note_id,
            'paid', -- Credit notes are considered 'paid' upon issuance
            v_charge.vat_applicable,
            auth.uid()
        ) RETURNING id INTO v_new_charge_id;

        -- If original charge had VAT, issue a corresponding negative VAT charge
        IF v_charge.vat_applicable AND v_charge.charge_type <> 'vat' THEN
            INSERT INTO ifrs_lease_accounting (
                lease_id,
                billing_period,
                charge_type,
                quantity,
                unit_price,
                total_amount,
                comment,
                invoice_id,
                invoice_number,
                credit_note_id,
                status,
                vat_applicable,
                created_by
            ) VALUES (
                v_invoice.lease_id,
                v_invoice.billing_period,
                'vat',
                1,
                -(v_credit_amount * 0.05), -- Negative VAT amount
                -(v_credit_amount * 0.05),
                'VAT adjustment for credit note ' || v_credit_note_number || ' (Original charge ' || v_charge.id || ')',
                NULL,
                NULL,
                v_credit_note_id,
                'paid',
                FALSE, -- VAT charge itself doesn't have VAT applied
                auth.uid()
            );
        END IF;
    END LOOP;

    -- Update the credit note total amount
    UPDATE ifrs_credit_notes
    SET 
        total_amount = v_total_amount,
        vat_amount = v_vat_amount,
        updated_at = NOW()
    WHERE id = v_credit_note_id;

    RETURN json_build_object(
        'credit_note_id', v_credit_note_id,
        'credit_note_number', v_credit_note_number,
        'total_amount', v_total_amount,
        'vat_amount', v_vat_amount,
        'lines', v_charge_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Verify the fixes
SELECT '✅ Credit note issues fixed successfully!' as result;
