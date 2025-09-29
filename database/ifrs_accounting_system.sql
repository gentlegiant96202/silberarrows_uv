    -- 🏛️ -COMPLIANT LEASE ACCOUNTING SYSTEM
    -- Complete recreation with all existing features +  compliance + transaction safety

    -- 1. ENUMS (matching existing system exactly)
    DO $$ BEGIN
        CREATE TYPE ifrs_charge_type_enum AS ENUM (
            'rental',     -- Monthly rental payments
            'salik',      -- Salik/toll charges  
            'mileage',    -- Excess mileage charges
            'late_fee',   -- Late payment fees
            'fine',       -- Traffic fines
            'refund',     -- Refunds/credits
            'credit_note' -- Credit notes (negative adjustments)
        );
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    -- Ensure VAT charge type exists for compliant invoicing
    DO $$ BEGIN
        ALTER TYPE ifrs_charge_type_enum ADD VALUE IF NOT EXISTS 'vat';
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE ifrs_accounting_status_enum AS ENUM (
            'pending',    -- Ready to be invoiced
            'invoiced',   -- Sent to customer
            'paid',       -- Fully paid
            'overdue'     -- Past due date
        );
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
        CREATE TYPE ifrs_credit_note_status_enum AS ENUM (
            'issued',
            'applied',
            'void'
        );
    EXCEPTION
        WHEN duplicate_object THEN null;
    END $$;

    -- 2. MAIN ACCOUNTING TABLE (Compliant with all existing features)
    CREATE TABLE IF NOT EXISTS ifrs_lease_accounting (
        -- Primary identification
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lease_id UUID NOT NULL REFERENCES leasing_customers(id) ON DELETE CASCADE,
        
        -- Billing period (matching existing system)
        billing_period DATE NOT NULL,
        
        -- Charge details (exactly like existing)
        charge_type ifrs_charge_type_enum NOT NULL,
        quantity NUMERIC NULL, -- For salik count, mileage km, etc.
        unit_price NUMERIC NULL, -- Price per unit
        total_amount NUMERIC NOT NULL, -- Final amount (quantity × unit_price or flat amount)
        comment TEXT NULL,
        
        -- Invoice and payment linking (exactly like existing)
        invoice_id UUID NULL, -- Groups charges into invoices
        invoice_number TEXT NULL, -- Sequential invoice number (INV-LE-1000, etc.)
        payment_id UUID NULL, -- Links to payment when paid
        credit_note_id UUID NULL, -- Links to credit note if this entry is part of one
        
        -- Status and settings (exactly like existing)
        status ifrs_accounting_status_enum NOT NULL DEFAULT 'pending',
        vat_applicable BOOLEAN NOT NULL DEFAULT true,
        account_closed BOOLEAN NOT NULL DEFAULT false,
        
        --  COMPLIANCE ADDITIONS
        -- Audit trail (required by )
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by UUID REFERENCES auth.users(id),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        -- Version control for optimistic locking (prevents concurrent editing issues)
        version INTEGER DEFAULT 1,
        
        -- Soft delete for audit trail ( requirement)
        deleted_at TIMESTAMP WITH TIME ZONE NULL,
        deleted_by UUID REFERENCES auth.users(id),
        deleted_reason TEXT NULL,
        
        -- Document attachments ( supporting documentation)
        documents JSONB DEFAULT '[]'::jsonb,
        
        --  adjustments and reversals tracking
        adjustment_reference UUID NULL, -- Links to original transaction if this is an adjustment
        reversal_reference UUID NULL,   -- Links to original transaction if this is a reversal
        
        -- Data integrity constraints
        CONSTRAINT valid_amount CHECK (
            (charge_type = 'refund' AND total_amount <= 0)
            OR (charge_type = 'credit_note' AND total_amount <= 0)
            OR (charge_type NOT IN ('refund', 'credit_note') AND total_amount >= 0)
        ),
        CONSTRAINT valid_quantity CHECK (quantity IS NULL OR quantity >= 0),
        CONSTRAINT valid_unit_price CHECK (unit_price IS NULL OR unit_price >= 0),
        CONSTRAINT valid_calculation CHECK (
            (quantity IS NULL OR unit_price IS NULL) OR 
            (ABS(total_amount - (quantity * unit_price)) < 0.01)
        )
    );

    -- 3. CUSTOMER BALANCE VIEW (Real-time balance calculation)
    CREATE OR REPLACE VIEW ifrs_lease_balances AS
    SELECT 
        lease_id,
        SUM(total_amount) as current_balance,
        SUM(CASE WHEN status = 'overdue' THEN total_amount ELSE 0 END) as overdue_amount,
        SUM(CASE WHEN status = 'invoiced' AND billing_period < CURRENT_DATE THEN total_amount ELSE 0 END) as past_due_amount,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
        MAX(CASE WHEN status = 'overdue' THEN billing_period END) as oldest_overdue_date,
        COUNT(*) as total_transactions,
        MIN(created_at) as first_transaction_date,
        MAX(updated_at) as last_activity_date
    FROM ifrs_lease_accounting 
    WHERE deleted_at IS NULL
    GROUP BY lease_id;

    -- 4. BILLING PERIODS VIEW (matching existing BillingPeriodsView functionality)
    CREATE OR REPLACE VIEW ifrs_billing_periods AS
    WITH period_data AS (
        SELECT 
            lease_id,
            billing_period,
            DATE_TRUNC('month', billing_period) as period_start,
            (DATE_TRUNC('month', billing_period) + INTERVAL '1 month - 1 day')::DATE as period_end,
            ARRAY_AGG(
                JSON_BUILD_OBJECT(
                    'id', id,
                    'charge_type', charge_type,
                    'total_amount', total_amount,
                    'status', status,
                    'invoice_id', invoice_id,
                    'created_at', created_at
                ) ORDER BY created_at
            ) as charges,
            SUM(total_amount) as total_amount,
            BOOL_OR(invoice_id IS NOT NULL) as has_invoice,
            STRING_AGG(DISTINCT invoice_id::TEXT, ',') as invoice_ids,
            CASE 
                WHEN BOOL_OR(status = 'overdue') THEN 'overdue'
                WHEN BOOL_OR(status = 'paid') AND NOT BOOL_OR(status IN ('pending', 'invoiced', 'overdue')) THEN 'paid'
                WHEN BOOL_OR(status = 'invoiced') THEN 'invoiced'
                WHEN BOOL_OR(status = 'pending') THEN 'pending_invoice'
                WHEN DATE_TRUNC('month', billing_period) > DATE_TRUNC('month', CURRENT_DATE) THEN 'upcoming'
                ELSE 'active'
            END as period_status
        FROM ifrs_lease_accounting 
        WHERE deleted_at IS NULL
        GROUP BY lease_id, billing_period, DATE_TRUNC('month', billing_period)
    )
    SELECT 
        lease_id,
        billing_period as period,
        period_start::TEXT as period_start,
        period_end::TEXT as period_end,
        charges,
        total_amount,
        has_invoice,
        invoice_ids,
        period_status as status
    FROM period_data;

    -- 5. SEQUENTIAL INVOICE NUMBERING
    -- Create sequence for invoice numbers starting at 1000
    CREATE SEQUENCE IF NOT EXISTS lease_invoice_sequence 
    START WITH 1000 
    INCREMENT BY 1 
    NO MAXVALUE 
    NO CYCLE;

    CREATE SEQUENCE IF NOT EXISTS lease_credit_note_sequence
    START WITH 1000
    INCREMENT BY 1
    NO MAXVALUE
    NO CYCLE;

    -- Credit note headers
    CREATE TABLE IF NOT EXISTS ifrs_credit_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lease_id UUID NOT NULL REFERENCES leasing_customers(id) ON DELETE CASCADE,
        original_invoice_id UUID NOT NULL,
        original_invoice_number TEXT,
        credit_note_number TEXT NOT NULL UNIQUE,
        status ifrs_credit_note_status_enum NOT NULL DEFAULT 'issued',
        total_amount NUMERIC NOT NULL DEFAULT 0,
        vat_amount NUMERIC NOT NULL DEFAULT 0,
        reason TEXT NULL,
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by UUID REFERENCES auth.users(id),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE NULL,
        deleted_by UUID REFERENCES auth.users(id)
    );

    -- Separate payments table (IFRS-compliant separation)
    CREATE TABLE IF NOT EXISTS ifrs_payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        lease_id UUID NOT NULL REFERENCES leasing_customers(id) ON DELETE CASCADE,
        payment_method TEXT NOT NULL,
        reference_number TEXT NULL,
        total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
        notes TEXT NULL,
        status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'allocated', 'refunded')),
        created_by UUID REFERENCES auth.users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_by UUID REFERENCES auth.users(id),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Payment applications (links payments to invoices)
    CREATE TABLE IF NOT EXISTS ifrs_payment_applications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_id UUID NOT NULL REFERENCES ifrs_payments(id) ON DELETE CASCADE,
        invoice_id UUID NOT NULL, -- References invoice_id from ifrs_lease_accounting
        applied_amount NUMERIC NOT NULL CHECK (applied_amount > 0),
        application_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id),
        notes TEXT NULL
    );

    CREATE TABLE IF NOT EXISTS ifrs_credit_note_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        credit_note_id UUID NOT NULL REFERENCES ifrs_credit_notes(id) ON DELETE CASCADE,
        original_charge_id UUID NOT NULL REFERENCES ifrs_lease_accounting(id),
        charge_type ifrs_charge_type_enum NOT NULL,
        quantity NUMERIC NULL,
        unit_price NUMERIC NULL,
        total_amount NUMERIC NOT NULL,
        comment TEXT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ifrs_credit_notes_lease_id ON ifrs_credit_notes(lease_id);
    CREATE INDEX IF NOT EXISTS idx_ifrs_credit_notes_status ON ifrs_credit_notes(status);
    CREATE INDEX IF NOT EXISTS idx_ifrs_credit_note_lines_credit_note_id ON ifrs_credit_note_lines(credit_note_id);
    CREATE INDEX IF NOT EXISTS idx_ifrs_payments_lease_id ON ifrs_payments(lease_id);
    CREATE INDEX IF NOT EXISTS idx_ifrs_payments_status ON ifrs_payments(status);
    CREATE INDEX IF NOT EXISTS idx_ifrs_payment_applications_payment_id ON ifrs_payment_applications(payment_id);
    CREATE INDEX IF NOT EXISTS idx_ifrs_payment_applications_invoice_id ON ifrs_payment_applications(invoice_id);

    DO $$ BEGIN
        ALTER TABLE ifrs_lease_accounting ADD COLUMN credit_note_id UUID;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END $$;

    -- 6. PERFORMANCE INDEXES
    CREATE INDEX IF NOT EXISTS idx_ifrs_lease_accounting_lease_id 
    ON ifrs_lease_accounting(lease_id) WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_lease_accounting_billing_period 
    ON ifrs_lease_accounting(billing_period) WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_lease_accounting_status 
    ON ifrs_lease_accounting(status) WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_lease_accounting_invoice_id 
    ON ifrs_lease_accounting(invoice_id) WHERE deleted_at IS NULL AND invoice_id IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_lease_accounting_payment_id 
    ON ifrs_lease_accounting(payment_id) WHERE deleted_at IS NULL AND payment_id IS NOT NULL;

    DROP INDEX IF EXISTS idx_ifrs_lease_accounting_invoice_number;
    DROP INDEX IF EXISTS idx_lease_accounting_invoice_number;
    CREATE INDEX IF NOT EXISTS idx_lease_accounting_invoice_number 
    ON ifrs_lease_accounting(invoice_number) WHERE deleted_at IS NULL AND invoice_number IS NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_lease_accounting_credit_note_id
    ON ifrs_lease_accounting(credit_note_id) WHERE deleted_at IS NULL AND credit_note_id IS NOT NULL;

    -- Composite indexes for complex queries
    CREATE INDEX IF NOT EXISTS idx_lease_accounting_lease_status 
    ON ifrs_lease_accounting(lease_id, status) WHERE deleted_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_lease_accounting_lease_period 
    ON ifrs_lease_accounting(lease_id, billing_period) WHERE deleted_at IS NULL;

    -- 7. INVOICE NUMBER HELPER FUNCTIONS

    -- Function to preview next invoice number (without consuming sequence)
    CREATE OR REPLACE FUNCTION preview_next_invoice_number()
    RETURNS TEXT AS $$
    DECLARE
        v_next_sequence INTEGER;
    BEGIN
        SELECT last_value + 1 INTO v_next_sequence 
        FROM lease_invoice_sequence;
        
        RETURN 'INV-LE-' || v_next_sequence::TEXT;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function to get current sequence value
    CREATE OR REPLACE FUNCTION get_current_invoice_sequence()
    RETURNS INTEGER AS $$
    BEGIN
        RETURN currval('lease_invoice_sequence');
    EXCEPTION
        WHEN SQLSTATE '55000' THEN -- sequence not yet used
            RETURN 999; -- Will be 1000 on first use
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Credit note helpers
    CREATE OR REPLACE FUNCTION preview_next_credit_note_number()
    RETURNS TEXT AS $$
    DECLARE
        v_next_sequence INTEGER;
    BEGIN
        SELECT last_value + 1 INTO v_next_sequence
        FROM lease_credit_note_sequence;

        RETURN 'CN-LE-' || LPAD(v_next_sequence::TEXT, 4, '0');
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    CREATE OR REPLACE FUNCTION get_current_credit_note_sequence()
    RETURNS INTEGER AS $$
    BEGIN
    RETURN currval('lease_credit_note_sequence');
    EXCEPTION
        WHEN SQLSTATE '55000' THEN
            RETURN 999;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 8. TRANSACTION-SAFE FUNCTIONS

    -- Function to add a charge (matching existing functionality)
    CREATE OR REPLACE FUNCTION ifrs_add_charge(
        p_lease_id UUID,
        p_billing_period DATE,
        p_charge_type ifrs_charge_type_enum,
        p_total_amount NUMERIC,
        p_quantity NUMERIC DEFAULT NULL,
        p_unit_price NUMERIC DEFAULT NULL,
        p_comment TEXT DEFAULT NULL,
        p_vat_applicable BOOLEAN DEFAULT true
    ) RETURNS UUID AS $$
    DECLARE
        v_charge_id UUID;
    BEGIN
        -- Insert charge with  audit trail
        INSERT INTO ifrs_lease_accounting (
            lease_id, billing_period, charge_type, quantity, unit_price, 
            total_amount, comment, status, vat_applicable, created_by
        ) VALUES (
            p_lease_id, p_billing_period, p_charge_type, p_quantity, p_unit_price,
            p_total_amount, p_comment, 'pending', p_vat_applicable, auth.uid()
        ) RETURNING id INTO v_charge_id;
        
        RETURN v_charge_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function to update a charge (-compliant with version control)
    CREATE OR REPLACE FUNCTION ifrs_update_charge(
        p_charge_id UUID,
        p_charge_type ifrs_charge_type_enum,
        p_total_amount NUMERIC,
        p_expected_version INTEGER DEFAULT 1,
        p_quantity NUMERIC DEFAULT NULL,
        p_unit_price NUMERIC DEFAULT NULL,
        p_comment TEXT DEFAULT NULL,
        p_vat_applicable BOOLEAN DEFAULT true
    ) RETURNS BOOLEAN AS $$
    DECLARE
        v_current_version INTEGER;
    BEGIN
        -- Check current version for optimistic locking
        SELECT version INTO v_current_version 
        FROM ifrs_lease_accounting 
        WHERE id = p_charge_id AND deleted_at IS NULL;
        
        IF v_current_version IS NULL THEN
            RAISE EXCEPTION 'Charge not found or has been deleted';
        END IF;
        
        IF v_current_version != p_expected_version THEN
            RAISE EXCEPTION 'Charge has been modified by another user. Please refresh and try again.';
        END IF;
        
        -- Update charge
        UPDATE ifrs_lease_accounting 
        SET 
            charge_type = p_charge_type,
            quantity = p_quantity,
            unit_price = p_unit_price,
            total_amount = p_total_amount,
            comment = p_comment,
            vat_applicable = p_vat_applicable,
            updated_by = auth.uid(),
            updated_at = NOW(),
            version = version + 1
        WHERE id = p_charge_id AND deleted_at IS NULL;
        
        RETURN true;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function to delete a charge ( soft delete)
    CREATE OR REPLACE FUNCTION ifrs_delete_charge(
        p_charge_id UUID,
        p_reason TEXT DEFAULT 'User requested deletion'
    ) RETURNS BOOLEAN AS $$
    BEGIN
        -- Soft delete for audit trail
        UPDATE ifrs_lease_accounting 
        SET 
            deleted_at = NOW(),
            deleted_by = auth.uid(),
            deleted_reason = p_reason,
            updated_at = NOW(),
            version = version + 1
        WHERE id = p_charge_id 
        AND deleted_at IS NULL
        AND status = 'pending'; -- Only allow deletion of pending charges
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Charge not found or cannot be deleted (may be already invoiced)';
        END IF;
        
        RETURN true;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function to generate invoice (transaction-safe with sequential numbering)
    CREATE OR REPLACE FUNCTION ifrs_generate_invoice(
        p_lease_id UUID,
        p_billing_period DATE,
        p_charge_ids UUID[],
        p_include_vat BOOLEAN DEFAULT true,
        p_vat_rate NUMERIC DEFAULT 0.05
    ) RETURNS JSON AS $$
    DECLARE
        v_invoice_id UUID;
        v_invoice_number TEXT;
        v_invoice_sequence INTEGER;
        v_existing_max INTEGER;
        v_affected_rows INTEGER;
        v_base_amount NUMERIC := 0;
        v_vat_amount NUMERIC := 0;
    BEGIN
        -- Generate invoice ID
        v_invoice_id := gen_random_uuid();

        -- Ensure sequential numbering cannot conflict by locking table
        LOCK TABLE ifrs_lease_accounting IN SHARE ROW EXCLUSIVE MODE;

        -- Determine the highest existing invoice number (ignoring deleted records)
        SELECT COALESCE(
            MAX(
                CAST(
                    SUBSTRING(TRIM(invoice_number) FROM 'INV-LE-(\d+)')
                    AS INTEGER
                )
            ),
            999
        )
        INTO v_existing_max
        FROM ifrs_lease_accounting
        WHERE invoice_number LIKE 'INV-LE-%'
        AND deleted_at IS NULL;

        -- Next sequential number (always higher than any active invoice)
        v_invoice_sequence := v_existing_max + 1;
        v_invoice_number := 'INV-LE-' || LPAD(v_invoice_sequence::TEXT, 4, '0');

        -- Keep sequence aligned for reference functions
        PERFORM setval('lease_invoice_sequence', v_invoice_sequence, true);

        -- Update charges to invoiced status atomically
        UPDATE ifrs_lease_accounting 
        SET 
            status = 'invoiced',
            invoice_id = v_invoice_id,
            invoice_number = v_invoice_number,
            updated_by = auth.uid(),
            updated_at = NOW(),
            version = version + 1
        WHERE id = ANY(p_charge_ids)
        AND lease_id = p_lease_id
        AND status = 'pending'
        AND deleted_at IS NULL;

        GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

        -- Verify all charges were updated
        IF v_affected_rows != array_length(p_charge_ids, 1) THEN
            RAISE EXCEPTION 'Failed to generate invoice - some charges could not be updated. Expected: %, Updated: %. Ensure all selected charges belong to the same billing period and remain pending.', 
                        array_length(p_charge_ids, 1), v_affected_rows;
        END IF;

        -- Calculate VAT if required
        IF p_include_vat THEN
            SELECT COALESCE(SUM(total_amount), 0) INTO v_base_amount
            FROM ifrs_lease_accounting
            WHERE invoice_id = v_invoice_id
            AND charge_type != 'vat'
            AND status = 'invoiced';

            v_vat_amount := ROUND(v_base_amount * p_vat_rate, 2);

            IF v_vat_amount > 0 AND NOT EXISTS (
                SELECT 1 FROM ifrs_lease_accounting
                WHERE invoice_id = v_invoice_id
                AND charge_type = 'vat'
                AND deleted_at IS NULL
            ) THEN
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
                    status,
                    vat_applicable,
                    created_by
                ) VALUES (
                    p_lease_id,
                    p_billing_period,
                    'vat',
                    NULL,
                    NULL,
                    v_vat_amount,
                    format('VAT @ %s%%', (p_vat_rate * 100)::TEXT),
                    v_invoice_id,
                    v_invoice_number,
                    'invoiced',
                    false,
                    auth.uid()
                );
            END IF;
        END IF;

        -- Return both invoice ID and number
        RETURN json_build_object(
            'invoice_id', v_invoice_id,
            'invoice_number', v_invoice_number,
            'sequence', v_invoice_sequence,
            'charges_updated', v_affected_rows,
            'vat_amount', v_vat_amount
        );
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

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
                status,
                vat_applicable,
                created_by,
                credit_note_id,
                adjustment_reference
            ) VALUES (
                v_charge.lease_id,
                v_charge.billing_period,
                'credit_note',
                v_charge.quantity,
                v_charge.unit_price,
                -v_credit_amount,
                COALESCE(p_reason, 'Credit note issued') || format(' (Original charge %s)', v_charge.id::TEXT),
                NULL,  -- Credit notes are NOT part of any invoice
                NULL,  -- Credit notes have their own numbering system
                'paid',  -- Credit notes are immediately effective, not "invoiced"
                v_charge.vat_applicable,
                auth.uid(),
                v_credit_note_id,
                v_charge.id
            ) RETURNING id INTO v_new_charge_id;

            UPDATE ifrs_lease_accounting
            SET reversal_reference = v_new_charge_id,
                updated_at = NOW(),
                updated_by = auth.uid(),
                version = version + 1
            WHERE id = v_charge.id;

            v_total_amount := v_total_amount - v_credit_amount;
            IF v_charge.charge_type = 'vat' THEN
                v_vat_amount := v_vat_amount - v_credit_amount;
            END IF;
        END LOOP;

        IF v_charge_count = 0 THEN
            RAISE EXCEPTION 'No eligible charges were found for the provided identifiers';
        END IF;

        UPDATE ifrs_credit_notes
        SET total_amount = v_total_amount,
            vat_amount = v_vat_amount,
            updated_at = NOW(),
            updated_by = auth.uid()
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

    CREATE OR REPLACE FUNCTION ifrs_void_credit_note(
        p_credit_note_id UUID,
        p_reason TEXT DEFAULT NULL
    ) RETURNS BOOLEAN AS $$
    DECLARE
        v_credit_note RECORD;
        v_line RECORD;
    BEGIN
        SELECT * INTO v_credit_note
        FROM ifrs_credit_notes
        WHERE id = p_credit_note_id
          AND status = 'issued'
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Credit note not found or cannot be voided';
        END IF;

        FOR v_line IN
            SELECT * FROM ifrs_credit_note_lines
            WHERE credit_note_id = p_credit_note_id
        LOOP
            DELETE FROM ifrs_lease_accounting
            WHERE credit_note_id = p_credit_note_id
              AND adjustment_reference = v_line.original_charge_id;

            UPDATE ifrs_lease_accounting
            SET reversal_reference = NULL,
                updated_at = NOW(),
                updated_by = auth.uid(),
                version = version + 1
            WHERE id = v_line.original_charge_id;
        END LOOP;

        UPDATE ifrs_credit_notes
        SET status = 'void',
            updated_at = NOW(),
            updated_by = auth.uid(),
            reason = CASE
                        WHEN p_reason IS NOT NULL THEN COALESCE(reason, '') || chr(10) || 'VOIDED: ' || p_reason
                        ELSE reason
                     END
        WHERE id = p_credit_note_id;

        RETURN true;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Function to record payment (IFRS-compliant - separate from charges)
CREATE OR REPLACE FUNCTION ifrs_record_payment(
    p_lease_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_reference TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_payment_id UUID;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be positive';
    END IF;

    INSERT INTO ifrs_payments (
        lease_id,
        payment_method,
        reference_number,
        total_amount,
        notes,
        status,
        created_by
    ) VALUES (
        p_lease_id,
        p_payment_method,
        p_reference,
        p_amount,
        p_notes,
        'received',
        auth.uid()
    ) RETURNING id INTO v_payment_id;

    RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to apply payment to invoice (replaces old credit application)
CREATE OR REPLACE FUNCTION ifrs_apply_payment(
    p_payment_id UUID,
    p_invoice_id UUID,
    p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
    v_credit RECORD;
    v_invoice RECORD;
    v_remaining_credit NUMERIC;
    v_existing_invoice_balance NUMERIC;
    v_comment TEXT;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount to apply must be positive';
    END IF;

    -- Fetch credit record
    SELECT * INTO v_credit
    FROM ifrs_lease_accounting
    WHERE id = p_credit_id
      AND charge_type = 'refund'
      AND invoice_id IS NULL
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit not found or already applied';
    END IF;

    v_remaining_credit := ABS(v_credit.total_amount);
    IF p_amount > v_remaining_credit THEN
        RAISE EXCEPTION 'Amount exceeds remaining credit (%.2f > %.2f)', p_amount, v_remaining_credit;
    END IF;

    -- Fetch invoice info
    SELECT 
        invoice_id,
        invoice_number,
        MIN(billing_period) AS billing_period
    INTO v_invoice
    FROM ifrs_lease_accounting
    WHERE invoice_id = p_invoice_id
      AND deleted_at IS NULL
    GROUP BY invoice_id, invoice_number;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;

    -- Insert applied payment line
    v_comment := COALESCE(v_credit.comment, 'PAYMENT') || format(' (Applied to %s)', COALESCE(v_invoice.invoice_number, v_invoice.invoice_id::TEXT));

    INSERT INTO ifrs_lease_accounting (
        lease_id,
        billing_period,
        charge_type,
        total_amount,
        comment,
        payment_id,
        invoice_id,
        invoice_number,
        status,
        vat_applicable,
        created_by
    ) VALUES (
        v_credit.lease_id,
        v_invoice.billing_period,
        'refund',
        -p_amount,
        v_comment,
        v_credit.payment_id,
        p_invoice_id,
        v_invoice.invoice_number,
        'paid',
        false,
        auth.uid()
    );

    -- Update or remove original credit record
    IF p_amount = v_remaining_credit THEN
        DELETE FROM ifrs_lease_accounting
        WHERE id = p_credit_id;
    ELSE
        UPDATE ifrs_lease_accounting
        SET total_amount = -(v_remaining_credit - p_amount),
            updated_at = NOW(),
            updated_by = auth.uid(),
            version = version + 1
        WHERE id = p_credit_id;
    END IF;

    -- Determine if invoice is now fully paid
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_existing_invoice_balance
    FROM ifrs_lease_accounting
    WHERE invoice_id = p_invoice_id
      AND deleted_at IS NULL;

    IF v_existing_invoice_balance <= 0 THEN
        UPDATE ifrs_lease_accounting
        SET status = 'paid',
            updated_at = NOW(),
            updated_by = auth.uid(),
            version = version + 1
        WHERE invoice_id = p_invoice_id
          AND charge_type != 'refund'
          AND status <> 'paid'
          AND deleted_at IS NULL;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 7. AUTOMATIC OVERDUE DETECTION
    CREATE OR REPLACE FUNCTION ifrs_update_overdue_status() RETURNS INTEGER AS $$
    DECLARE
        v_updated_count INTEGER;
    BEGIN
        UPDATE ifrs_lease_accounting 
        SET status = 'overdue',
            updated_at = NOW(),
            version = version + 1
        WHERE status = 'invoiced' 
        AND billing_period < CURRENT_DATE - INTERVAL '30 days' -- 30 days past due
        AND deleted_at IS NULL;
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        RETURN v_updated_count;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- 8. TRIGGERS FOR AUDIT TRAIL
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        NEW.updated_by = COALESCE(NEW.updated_by, auth.uid());
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_lease_accounting_updated_at ON ifrs_lease_accounting;
    CREATE TRIGGER trg_lease_accounting_updated_at
        BEFORE UPDATE ON ifrs_lease_accounting
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- 9. ROW LEVEL SECURITY ( access controls)
    ALTER TABLE ifrs_lease_accounting ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Accounts users can manage transactions" ON ifrs_lease_accounting;
    DROP POLICY IF EXISTS "Leasing users can view transactions" ON ifrs_lease_accounting;

    -- Accounts and admin users can manage all transactions
    CREATE POLICY "Accounts users can manage transactions" ON ifrs_lease_accounting
        FOR ALL USING (
            auth.uid() IS NOT NULL AND (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() 
                    AND role IN ('admin', 'accounts')
                )
            )
        );

    -- Leasing users can view transactions for their leases
    CREATE POLICY "Leasing users can view transactions" ON ifrs_lease_accounting
        FOR SELECT USING (
            auth.uid() IS NOT NULL AND (
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() 
                    AND role IN ('admin', 'accounts', 'leasing')
                )
            )
        );

    -- 10. SCHEDULED OVERDUE UPDATES (optional cron job)
    /*
    -- Run this as a scheduled function to automatically update overdue status
    SELECT cron.schedule('update-overdue-invoices', '0 6 * * *', 'SELECT ifrs_update_overdue_status();');
    */

    -- Success message
    SELECT '-Compliant Lease Accounting System created successfully! 🏛️' as result;
